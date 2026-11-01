import os
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.core.config import settings
from backend.app.services.remediation.base import BaseRemediationAdapter, RemediationResult, STATE_UNCONFIGURED

PERMITTED_DEPLOYMENTS = {
    "webguard-ingress",
    "webguard-worker",
    "webguard-api",
    "webguard-backend",
    "webguard-proxy"
}

class KubernetesAdapter(BaseRemediationAdapter):
    @property
    def adapter_name(self) -> str:
        return "kubernetes_cluster"

    def is_configured(self) -> bool:
        # Check if in-cluster service account or KUBECONFIG exists
        in_cluster = os.path.exists("/var/run/secrets/kubernetes.io/serviceaccount/token")
        kubeconfig = bool(os.environ.get("KUBECONFIG") or os.path.exists(os.path.expanduser("~/.kube/config")))
        return settings.KUBERNETES_ENABLED and (in_cluster or kubeconfig)

    async def execute(
        self,
        parameters: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> RemediationResult:
        start_time = time.time()
        service_name = parameters.get("service_name", "").strip().lower()
        delta = parameters.get("replica_delta", 1)
        max_replicas = parameters.get("max_replicas", 10)
        action_sub_type = parameters.get("action_sub_type", "scale")  # scale | rollback

        # Boundary checks
        if service_name not in PERMITTED_DEPLOYMENTS:
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status="failed",
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=f"SECURITY VIOLATION: Deployment '{service_name}' is not in permitted deployment allowlist: {sorted(list(PERMITTED_DEPLOYMENTS))}",
                details={"permitted": sorted(list(PERMITTED_DEPLOYMENTS))}
            )

        if not self.is_configured():
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status=STATE_UNCONFIGURED,
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=(
                    f"Kubernetes cluster integration is unconfigured (KUBERNETES_ENABLED=False or no cluster credentials). "
                    f"Remediation action '{action_sub_type}' on deployment '{service_name}' cannot execute live."
                ),
                details={
                    "deployment": service_name,
                    "namespace": settings.KUBERNETES_NAMESPACE,
                    "delta": delta,
                    "max_replicas": max_replicas
                }
            )

        # In production cluster with configured credentials, execute via kubernetes python client
        try:
            # Dynamic import of kubernetes client if installed in production image
            from kubernetes import client, config
            try:
                config.load_incluster_config()
            except Exception:
                config.load_kube_config()

            apps_v1 = client.AppsV1Api()
            namespace = settings.KUBERNETES_NAMESPACE

            if action_sub_type == "rollback":
                # Trigger rollout restart / rollback
                body = {
                    "spec": {
                        "template": {
                            "metadata": {
                                "annotations": {
                                    "kubectl.kubernetes.io/restartedAt": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        }
                    }
                }
                res = apps_v1.patch_namespaced_deployment(name=service_name, namespace=namespace, body=body)
                elapsed_ms = (time.time() - start_time) * 1000
                return RemediationResult(
                    success=True,
                    status="executed",
                    adapter_name=self.adapter_name,
                    duration_ms=elapsed_ms,
                    message=f"Dispatched rollout restart on Kubernetes deployment {service_name} in namespace {namespace}.",
                    details={"generation": res.metadata.generation}
                )
            else:
                # Scale deployment
                scale_obj = apps_v1.read_namespaced_deployment_scale(name=service_name, namespace=namespace)
                curr_replicas = scale_obj.spec.replicas or 1
                new_replicas = min(max_replicas, max(1, curr_replicas + delta))
                scale_obj.spec.replicas = new_replicas
                res = apps_v1.replace_namespaced_deployment_scale(name=service_name, namespace=namespace, body=scale_obj)
                elapsed_ms = (time.time() - start_time) * 1000
                return RemediationResult(
                    success=True,
                    status="executed",
                    adapter_name=self.adapter_name,
                    duration_ms=elapsed_ms,
                    message=f"Scaled deployment {service_name} in {namespace} from {curr_replicas} to {new_replicas} replicas.",
                    details={"previous_replicas": curr_replicas, "new_replicas": new_replicas}
                )

        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status="failed",
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=f"Kubernetes cluster API error: {str(e)}",
                details={"error": str(e)}
            )

k8s_adapter = KubernetesAdapter()
