import numpy as np

RANGOS_MOLDE = {
    "Molde 4 pulgadas": (930, 955),
    "Molde 6 pulgadas": (2100, 2150),
}

HUMEDADES_TEORICAS = {
    "Grava": "4% a 8%",
    "Arena": "6% a 10%",
    "Arena limosa": "8% a 13%",
    "Limo": "10% a 16%",
    "Limo de baja plasticidad": "10% a 16%",
    "Arcilla baja plasticidad": "12% a 20%",
    "Arcilla de baja plasticidad": "12% a 20%",
    "Arcilla alta plasticidad": "18% a 30%",
    "Arcilla de alta plasticidad": "18% a 30%",
}

def calcular_saturacion(gs, s, humedades):
    rho_w = 1.0
    curva = []
    for w in humedades:
        w_decimal = w / 100
        rho_d = (gs * rho_w) / (1 + ((w_decimal * gs) / s))
        curva.append(rho_d)
    return curva

def corregir_densidad(densidad_seca, porcentaje_grueso, gs_grueso):
    pg = porcentaje_grueso / 100
    if pg <= 0:
        return densidad_seca
    gamma_grueso = gs_grueso * 1.0
    return 1 / (((1 - pg) / densidad_seca) + (pg / gamma_grueso))

def validar_volumen(molde, volumen):
    if molde not in RANGOS_MOLDE:
        return []
    minimo, maximo = RANGOS_MOLDE[molde]
    if volumen < minimo:
        return [f"Volumen bajo para {molde}. Verificar calibración del molde."]
    if volumen > maximo:
        return [f"Volumen alto para {molde}. Revisar dimensiones internas del molde."]
    return []

def recomendacion_humedad(tipo_suelo, sistema_suelo, aashto, sucs, pasa_200, ll, ip):
    base = HUMEDADES_TEORICAS.get(tipo_suelo, "10% a 16%")
    nota = f"Humedad inicial recomendada para {tipo_suelo or 'suelo seleccionado'}: {base}."
    if pasa_200 >= 50 and ip >= 15:
        nota += " Por el contenido de finos y plasticidad, iniciar con incrementos de 2% y controlar amasado uniforme."
    elif pasa_200 < 35:
        nota += " Por menor contenido de finos, usar incrementos de agua moderados y evitar segregación."
    if sucs:
        nota += f" Clasificación SUCS registrada: {sucs}."
    if aashto:
        nota += f" Clasificación AASHTO registrada: {aashto}."
    if sistema_suelo:
        nota += f" Sistema seleccionado: {sistema_suelo}."
    return nota

def calcular_proctor(data):
    resultados, humedades, densidades, densidades_corregidas, alarmas = [], [], [], [], []

    for i, p in enumerate(data.puntos):
        alarmas.extend(validar_volumen(data.molde, p.volumen))
        peso_suelo_humedo = p.peso_molde_suelo - p.peso_molde
        densidad_humeda = peso_suelo_humedo / p.volumen if p.volumen else 0
        densidad_seca = densidad_humeda / (1 + p.humedad / 100) if p.humedad > -100 else 0

        humedades.append(p.humedad)
        densidades.append(densidad_seca)
        d_corr = corregir_densidad(densidad_seca, data.correccion.porcentaje_grueso, data.correccion.gs_grueso) if data.correccion.aplicar else densidad_seca
        densidades_corregidas.append(d_corr)

        resultados.append({
            "punto": i + 1,
            "molde_id": p.molde_id,
            "peso_suelo_humedo": peso_suelo_humedo,
            "densidad_humeda": densidad_humeda,
            "humedad": p.humedad,
            "densidad_seca": densidad_seca,
            "densidad_corregida": d_corr,
        })

        if p.humedad < 1:
            alarmas.append(f"Punto {i+1}: humedad demasiado baja.")
        if p.humedad > 40:
            alarmas.append(f"Punto {i+1}: humedad demasiado alta.")
        if densidad_seca <= 0:
            alarmas.append(f"Punto {i+1}: densidad seca inválida.")
        if densidad_humeda < densidad_seca:
            alarmas.append(f"Punto {i+1}: densidad húmeda menor que densidad seca.")

    for i in range(1, len(humedades)):
        if humedades[i] <= humedades[i-1]:
            alarmas.append(f"Humedad no creciente entre punto {i} y {i+1}.")
        if abs(densidades[i] - densidades[i-1]) > 0.15:
            alarmas.append(f"Salto brusco de densidad entre punto {i} y {i+1}.")

    if len(humedades) < 3:
        return {"error": "Se necesitan al menos 3 puntos para generar la curva Proctor."}

    coef = np.polyfit(humedades, densidades, 2)
    x = np.linspace(min(humedades), max(humedades), 120)
    y = coef[0] * x**2 + coef[1] * x + coef[2]
    h_opt = -coef[1] / (2 * coef[0]) if coef[0] != 0 else humedades[densidades.index(max(densidades))]
    d_max = coef[0] * h_opt**2 + coef[1] * h_opt + coef[2]

    if data.correccion.aplicar:
        coef_corr = np.polyfit(humedades, densidades_corregidas, 2)
        y_corr = coef_corr[0] * x**2 + coef_corr[1] * x + coef_corr[2]
        h_opt_corr = -coef_corr[1] / (2 * coef_corr[0]) if coef_corr[0] != 0 else h_opt
        d_max_corr = coef_corr[0] * h_opt_corr**2 + coef_corr[1] * h_opt_corr + coef_corr[2]
    else:
        y_corr, h_opt_corr, d_max_corr = y, h_opt, d_max

    if coef[0] >= 0:
        alarmas.append("La curva no presenta concavidad negativa. Revisar datos de compactación.")
    if h_opt < min(humedades) or h_opt > max(humedades):
        alarmas.append("La humedad óptima queda fuera del rango ensayado. Agregar puntos adicionales.")
    if max(densidades) == densidades[-1]:
        alarmas.append("El último punto sigue siendo el mayor. Puede faltar un punto con mayor humedad.")

    return {
        "datos_generales": data.datos_generales.dict(),
        "metodo": data.metodo,
        "molde": data.molde,
        "parametros": {
            "peso_martillo": data.peso_martillo,
            "altura_caida": data.altura_caida,
            "capas": data.capas,
            "golpes_capa": data.golpes_capa,
            "volumen_esperado": data.volumen_esperado,
            "gs_suelo": data.gs_suelo,
            "sistema_suelo": data.sistema_suelo,
            "aashto": data.aashto,
            "sucs": data.sucs,
            "moldes": [m.dict() for m in data.moldes],
        },
        "resultados": resultados,
        "humedad_optima": h_opt,
        "densidad_maxima": d_max,
        "humedad_optima_corregida": h_opt_corr,
        "densidad_maxima_corregida": d_max_corr,
        "recomendacion_humedad": recomendacion_humedad(data.tipo_suelo, data.sistema_suelo, data.aashto, data.sucs, data.pasa_200, data.limite_liquido, data.indice_plastico),
        "curva": {
            "x": x.tolist(),
            "original": y.tolist(),
            "corregida": y_corr.tolist(),
            "s80": calcular_saturacion(data.gs_suelo, 0.80, x),
            "s90": calcular_saturacion(data.gs_suelo, 0.90, x),
            "s100": calcular_saturacion(data.gs_suelo, 1.00, x),
        },
        "alarmas": list(dict.fromkeys(alarmas)),
    }
