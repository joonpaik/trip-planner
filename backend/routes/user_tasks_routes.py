from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db


router = APIRouter(prefix="/user_tasks", tags=["User Tasks"])

@router.get("/fetch")
async def fetch_user_tasks(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT * 
            FROM user_tasks
        """)
        result = db.execute(query)
        # fetched_result = result.fetchall()
        # print(f"Raw Result: {fetched_result}")
        columns = result.keys()
        rows = result.fetchall()
        data = []
        for row in rows:
            row_dict = {}
            for i, column in enumerate(columns):
                row_dict[column] = row[i]
            data.append(row_dict)
        
        print(f"Returning {len(data)} rows")  # Debug print
        return data
        # return fetched_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
