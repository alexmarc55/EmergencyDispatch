from database import Base
from sqlalchemy import Column, Integer, String, Float
class AmbulanceDB(Base):
    __tablename__ = 'ambulances'

    id = Column(Integer, primary_key = True, index = True)
    status = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    default_lat = Column(Float, default = None)
    default_lon = Column(Float, default = None)

class IncidentDB(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key= True, index = True)
    severity = Column(Integer)
    lat = Column(Float)
    lon = Column(Float)
    assigned_unit = Column(Integer, default = None)