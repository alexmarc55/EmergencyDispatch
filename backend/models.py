from database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
class AmbulanceDB(Base):
    __tablename__ = 'ambulances'
    id = Column(Integer, primary_key = True, index = True)
    status = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    capacity = Column(Integer)
    default_lat = Column(Float, default = None)
    default_lon = Column(Float, default = None)
    available_at = Column(DateTime, nullable=True)
    route_to_assigned_unit = Column(JSON, nullable=True)

class IncidentDB(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key= True, index = True)
    status = Column(String)
    severity = Column(Integer)
    type = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    nr_patients = Column(Integer)
    assigned_unit = Column(Integer, default = None)
    assigned_hospital = Column(Integer, nullable=True)
    route_to_incident = Column(JSON, nullable=True)
    route_to_hospital = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

class HospitalDB(Base):
    __tablename__ = 'hospitals'
    id = Column(Integer, primary_key= True, index = True)
    name = Column(String)
    type = Column(String) # UPU, CPU, Privat
    lat = Column(Float)
    lon = Column(Float)

class EmergencyCentersDB(Base):
    __tablename__ = 'emergency_centers'
    id = Column(Integer, primary_key= True, index = True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)

class UserDB(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key= True, index = True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)
    badge_number = Column(String, nullable=True)

class PatientDB(Base):
    __tablename__ = 'patients'
    id = Column(Integer, primary_key= True, index = True)
    name = Column(String)
    age = Column(Integer, nullable=True)
    phone_number = Column(String, nullable=True)
    medical_history = Column(JSON, nullable=True)