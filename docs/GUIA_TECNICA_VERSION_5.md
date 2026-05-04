# Guía técnica - GeoCompact Pro v5

## 1. Datos del ensayo

La aplicación permite registrar información general del proyecto, muestra, ubicación, técnico responsable y observaciones.

## 2. Método Proctor

### Proctor Estándar

- Martillo: 2.5 kg
- Altura de caída: 305 mm
- Capas: 3
- Golpes por capa: 25

### Proctor Modificado

- Martillo: 4.54 kg
- Altura de caída: 457 mm
- Capas: 5
- Golpes por capa: 25

## 3. Moldes

- Molde 4 pulgadas: volumen esperado aproximado de 943 cm³.
- Molde 6 pulgadas: volumen esperado aproximado de 2124 cm³.
- Molde personalizado: editable.

## 4. Cálculos principales

Peso del suelo húmedo:

```txt
Peso suelo húmedo = Peso molde + suelo húmedo - Peso molde
```

Densidad húmeda:

```txt
Densidad húmeda = Peso suelo húmedo / Volumen del molde
```

Densidad seca:

```txt
Densidad seca = Densidad húmeda / (1 + humedad/100)
```

## 5. Grado de saturación

```txt
ρd = Gs × ρw / [1 + (w × Gs / S)]
```

Donde:

- ρd = densidad seca
- Gs = gravedad específica del suelo
- ρw = densidad del agua
- w = humedad decimal
- S = grado de saturación decimal

## 6. Alarmas incorporadas

- Volumen fuera de rango.
- Humedad demasiado baja.
- Humedad demasiado alta.
- Humedad no creciente.
- Densidad seca inválida.
- Densidad húmeda menor que densidad seca.
- Salto brusco entre densidades.
- Curva sin concavidad adecuada.
- Humedad óptima fuera del rango ensayado.
- Último punto con densidad máxima, indicando que podría faltar más humedad.

## 7. Reporte PDF

El PDF incluye:

- Encabezado profesional.
- Datos generales.
- Método y molde.
- Resultados principales.
- Tabla de densidades.
- Gráfica Proctor y saturación.
- Alarmas y observaciones.
