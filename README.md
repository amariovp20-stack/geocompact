# GeoCompact Pro v5

Aplicación web para generar reporte de ensayo Proctor estándar y modificado.

## Funciones incluidas

- Selección de Proctor Estándar o Modificado.
- Selección de molde de 4”, 6” o personalizado.
- Carga automática de parámetros: martillo, caída, capas y golpes por capa.
- Validación de volumen del molde.
- Cálculo de densidad húmeda y densidad seca.
- Detección de datos incoherentes mediante alarmas.
- Recomendación de humedad teórica según tipo de suelo.
- Curva Proctor original.
- Curva corregida por material grueso.
- Líneas de saturación S=80%, S=90% y S=100%.
- Generación de PDF profesional con tabla, resultados, gráfica y alarmas.

## Instalación del backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

El backend se abre en:

```txt
http://127.0.0.1:8000/docs
```

## Instalación del frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se abre normalmente en:

```txt
http://localhost:5173
```

## Recomendación técnica

Esta versión es una base funcional académica/profesional. Para uso oficial de laboratorio, se debe revisar y ajustar los rangos de control, criterios de corrección y formato del reporte según el procedimiento interno del laboratorio y la norma adoptada.
