# Agrega o AUTOSEG (SUSEP, 1º semestre de 2021, cobertura casco) por código FIPE e ano-modelo, e
# também por GRUPO de modelo da SUSEP (todas as versões de um modelo, ex.: "GM CHEVROLET CELTA 1.0"),
# na região 13 (a de Divinolândia: "SP - Ribeirão Preto e Demais Mun. de Campinas") e em todo o
# estado de SP (regiões 09 a 13). Só categorias de passeio (1 nacional e 2 importado).
# Saída: autoseg-2021A.json
#   { "versao": { "014049-0|2008": { "r13": {...}, "sp": {...} } },
#     "grupo":  { "168|2014": { "nome": "...", "r13": {...}, "sp": {...} } },
#     "grupoDe": { "004319-2": "168" } }
import csv, json, collections
grupo_de, nome_grupo = {}, {}
with open('auto2_vei.csv', encoding='latin1', newline='') as f:
    for r in csv.DictReader(f, delimiter=';'):
        grupo_de[r['CODIGO']] = r['COD_GRUPO']; nome_grupo[r['COD_GRUPO']] = r['GRUPO']
novo = lambda: {'r13': [0.0, 0.0, 0.0], 'sp': [0.0, 0.0, 0.0]}
ver, grp = collections.defaultdict(novo), collections.defaultdict(novo)
with open('arq_casco_comp.csv', encoding='latin1', newline='') as f:
    for r in csv.DictReader(f, delimiter=';'):
        if r['COD_TARIF'] not in ('1', '2') or r['REGIAO'] not in ('09', '10', '11', '12', '13'): continue
        e = float(r['EXPOSICAO1'].replace(',', '.')); p = float(r['PREMIO1'].replace(',', '.')); i = float(r['IS_MEDIA'].replace(',', '.'))
        if e <= 0: continue
        alvos = ['r13', 'sp'] if r['REGIAO'] == '13' else ['sp']
        g = grupo_de.get(r['COD_MODELO'])
        for d, k in ((ver, r['COD_MODELO'] + '|' + r['ANO_MODELO']), (grp, (g or '?') + '|' + r['ANO_MODELO'])):
            for a in alvos:
                x = d[k][a]; x[0] += e; x[1] += p; x[2] += i * e
fmt = lambda v: {n: {'exposicao': round(e, 2), 'premioMedio': round(p / e, 2), 'isMedia': round(i / e, 2)} for n, (e, p, i) in v.items() if e > 0}
out = {'versao': {k: fmt(v) for k, v in ver.items()}, 'grupo': {k: {'nome': nome_grupo.get(k.split('|')[0], '?'), **fmt(v)} for k, v in grp.items()}, 'grupoDe': grupo_de}
json.dump(out, open('autoseg-2021A.json', 'w'), ensure_ascii=False)
print(out['grupo'].get('168|2014'))
