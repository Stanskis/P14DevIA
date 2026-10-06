import os
import bcrypt
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine, select

from .models import User

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)


def init_db():
    SQLModel.metadata.create_all(engine)

    default_email = "test@test.com"
    default_password = "test"

    with Session(engine) as session:
        statement = select(User).where(User.email == default_email)
        user = session.exec(statement).first()

        if not user:
            hashed_bytes = bcrypt.hashpw(
                default_password.encode("utf-8"),
                bcrypt.gensalt()
            )
            session.add(
                User(
                    email=default_email,
                    hashed_password=hashed_bytes.decode("utf-8"),
                )
            )
            session.commit()
