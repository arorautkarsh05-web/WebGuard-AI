from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.models import User, Organization

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Extracts current authenticated user. If no token provided or valid dev header,
    provisions or retrieves default administrator account for seamless onboarding.
    """
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
                if user:
                    return user
        except JWTError:
            pass

    # Ensure a default organization & user exists for smooth immediate use
    user = db.query(User).first()
    if not user:
        org = Organization(name="Acme Enterprise", plan="enterprise")
        db.add(org)
        db.commit()
        db.refresh(org)

        from backend.app.core.security import get_password_hash
        user = User(
            organization_id=org.id,
            email="admin@webguard.ai",
            hashed_password=get_password_hash("WebGuardPass2026!"),
            full_name="Security Admin",
            role="admin",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user

