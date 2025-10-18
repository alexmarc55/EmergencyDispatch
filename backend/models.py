from database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
class AmbulanceDB(Base):
    __tablename__ = 'ambulances'

    id = Column(Integer, primary_key = True, index = True)
    status = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    default_lat = Column(Float, default = None)
    default_lon = Column(Float, default = None)
    available_at = Column(DateTime, nullable=True)

class IncidentDB(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key= True, index = True)
    status = Column(String)
    severity = Column(Integer)
    lat = Column(Float)
    lon = Column(Float)
    assigned_unit = Column(Integer, default = None)