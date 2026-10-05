from database import engine, init_db
from fastapi import Depends, FastAPI
from models import User
from sqlmodel import Session, SQLModel, select
import uvicorn

app = FastAPI()


def get_session():
    with Session(engine) as session:
        yield session


class UserRead(SQLModel):
    id: int
    email: str


@app.get("/")
async def hello():
    return {"message": "👋"}


@app.get("/users", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()


if __name__ == "__main__":
    init_db()

    uvicorn.run(app, host="0.0.0.0", port=8000)
