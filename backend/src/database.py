import os

from sqlmodel import Session, SQLModel, create_engine, select

from src.models import User
from src.security import hash_password

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, echo=True)


def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    SQLModel.metadata.create_all(engine)

    default_email = "test@test.com"
    default_password = "test"

    with Session(engine) as session:
        user = session.exec(select(User).where(
            User.email == default_email)).first()
        if not user:
            session.add(
                User(
                    email=default_email,
                    hashed_password=hash_password(default_password),
                )
            )
            session.commit()
