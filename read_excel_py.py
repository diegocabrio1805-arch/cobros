import json, sys

# Try openpyxl first, then xlrd
try:
    import openpyxl
    wb = openpyxl.load_workbook(r'C:\Users\HP\Desktop\prueba 77777.xlsx', data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    data = []
    for row in rows[:10]:
        data.append([str(c) if c is not None else '' for c in row])
    result = {'method': 'openpyxl', 'total_rows': len(rows), 'rows': data}
    with open(r'C:\Users\HP\.gemini\antigravity\scratch\cobros\prueba77777_output.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print('OK openpyxl - rows:', len(rows))
except Exception as e1:
    try:
        import xlrd
        wb = xlrd.open_workbook(r'C:\Users\HP\Desktop\prueba 77777.xlsx')
        ws = wb.sheet_by_index(0)
        data = []
        for i in range(min(10, ws.nrows)):
            data.append([str(ws.cell_value(i,j)) for j in range(ws.ncols)])
        result = {'method': 'xlrd', 'total_rows': ws.nrows, 'rows': data}
        with open(r'C:\Users\HP\.gemini\antigravity\scratch\cobros\prueba77777_output.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print('OK xlrd - rows:', ws.nrows)
    except Exception as e2:
        print(f'ERROR openpyxl: {e1}')
        print(f'ERROR xlrd: {e2}')
