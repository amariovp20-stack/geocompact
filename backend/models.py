from pydantic import BaseModel
from typing import List, Optional

class DatosGenerales(BaseModel):
    proyecto: str = ""
    solicitante: str = ""
    ubicacion: str = ""
    muestra: str = ""
    profundidad: str = ""
    procedencia: str = ""
    fecha: str = ""
    tecnico: str = ""
    observaciones: str = ""

class PuntoCompactacion(BaseModel):
    molde_id: str = ""
    peso_molde_suelo: float
    peso_molde: float
    volumen: float
    humedad: float
    peso_recipiente: Optional[float] = 0
    peso_recipiente_suelo_humedo: Optional[float] = 0
    peso_recipiente_suelo_seco: Optional[float] = 0

class MoldeEnsayo(BaseModel):
    id: str = ""
    nombre: str = ""
    peso: float = 0
    volumen: float = 0

class CorreccionData(BaseModel):
    aplicar: bool = False
    porcentaje_grueso: Optional[float] = 0
    gs_grueso: Optional[float] = 2.65

class ProctorData(BaseModel):
    datos_generales: DatosGenerales = DatosGenerales()
    metodo: str
    molde: str
    peso_martillo: float
    altura_caida: float
    capas: int
    golpes_capa: int
    volumen_esperado: float
    moldes: List[MoldeEnsayo] = []
    gs_suelo: float = 2.65
    sistema_suelo: str = ""
    tipo_suelo: str = ""
    aashto: str = ""
    sucs: str = ""
    pasa_200: float = 0
    limite_liquido: float = 0
    indice_plastico: float = 0
    puntos: List[PuntoCompactacion]
    correccion: Optional[CorreccionData] = CorreccionData()
