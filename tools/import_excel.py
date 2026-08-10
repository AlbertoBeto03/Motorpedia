"""
Motorpedia — importador Excel -> JSON
Uso:
    python tools/import_excel.py
Lee "Base de Datos.xlsx" desde la raíz y regenera data/*.json.
La versión completa del importador se mantiene junto a la V1 distribuida por ChatGPT.
"""
from pathlib import Path
import sys
print("Motorpedia V1: el Excel ya está convertido en data/vehicles.json.")
print("En la siguiente fase se integrará aquí el actualizador de un solo clic.")
print("Fuente esperada:", Path(__file__).resolve().parents[1] / "Base de Datos.xlsx")
