# ONE WORKBOOK OF THE WHOLE ESTABLISHMENT, compiled from what the offices
# returned. Two steps, both inside hms/HRMS DATA (gitignored) and nowhere else:
#
#   1. any old-format .xls in the folder is saved beside itself as .xlsx, so
#      tests/hrms-base-seed.js can read it with the rest (it reads xlsx only);
#   2. the reader's two outputs, _PASTE.tsv and _ISSUES.csv, are compiled into
#      _ALL-EMPLOYEES.xlsx: the Base Format sheet in the format's own shape
#      (title, code row, headings, one row an employee, a Source column at the
#      end naming the office's workbook), an Issues sheet, and a Summary by
#      office.
#
# Run the reader between the two steps:
#     python tests/hrms-base-workbook.py convert
#     node tests/hrms-base-seed.js
#     python tests/hrms-base-workbook.py compile
#
# openpyxl is on the machine; xlrd (for the .xls) was installed for the user,
# so its site directory is added by hand because the interpreter runs isolated
# (-I) and must not import anything from the data folder.
import sys, os, csv, glob, re, datetime, site
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hms', 'HRMS DATA')
D = os.path.abspath(D)
sys.path.append(site.getusersitepackages())
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

HEADINGS = ['Employee ID (IFMIS / Treasury)','Full name as in Service Register','Gender','Date of birth','Mobile number','Official e-mail',
  'Employment category','Department','Designation','Office (as in letterhead)','Place of working','Gazetted or Non-Gazetted',
  'Date of entry into Government service','Date of joining the present post','Date of joining the district','Pay scale or level','DDO code',
  'Vacation department','Present status','Residing at headquarters','Residential address','Controlling officer',
  'Authority to sanction casual leave','Authority to sanction other leave','Leave balances as on','Earned leave at credit (days)',
  'Half pay leave at credit (days)','Casual leave availed in the year up to D1 (days)','Optional holidays availed in the year up to D1',
  'Child care leave availed in service up to D1 (days)','Number of surviving children','Service Register verified by','Date of verification','Remarks']
CODES = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B12','B13','B14','B15',
         'C1','C2','C3','D1','D2','D3','D4','D5','D6','D7','D8','D9','R1']
DATES = {'A4','B7','B8','B9','D1','D9'}
NUMS = {'D2','D3','D4','D5','D6','D7'}

def convert():
    import xlrd
    n = 0
    for f in glob.glob(os.path.join(D, '*.xls')):
        out = f[:-4] + ' (converted).xlsx'
        if os.path.exists(out): print('exists  ', os.path.basename(out)); continue
        b = xlrd.open_workbook(f, formatting_info=False)
        wb = openpyxl.Workbook(); wb.remove(wb.active)
        for sh in b.sheets():
            ws = wb.create_sheet(sh.name[:31])
            for r in range(sh.nrows):
                row = []
                for c in range(sh.ncols):
                    cell = sh.cell(r, c); v = cell.value
                    if cell.ctype == xlrd.XL_CELL_DATE:
                        try: v = datetime.datetime(*xlrd.xldate_as_tuple(v, b.datemode))
                        except Exception: pass
                    elif cell.ctype == xlrd.XL_CELL_NUMBER and float(v).is_integer(): v = int(v)
                    row.append(v)
                ws.append(row)
        wb.save(out); n += 1
        print('converted', os.path.basename(f), '->', os.path.basename(out))
    print(n, 'converted')

def to_date(s):
    # a day and month transposed by an office is not a date; it is kept as
    # typed, and the issues sheet already names it
    m = re.match(r'^(\d{2})-(\d{2})-(\d{4})$', s or '')
    if not m: return s or None
    try: return datetime.date(int(m[3]), int(m[2]), int(m[1]))
    except ValueError: return s

def compile_():
    tsv = os.path.join(D, '_PASTE.tsv'); iss = os.path.join(D, '_ISSUES.csv')
    if not os.path.exists(tsv): print('run node tests/hrms-base-seed.js first'); sys.exit(1)
    rows = [l.rstrip('\r\n').split('\t') for l in open(tsv, encoding='utf-8')]
    head = rows[0]; data = rows[1:]
    issues = list(csv.reader(open(iss, encoding='utf-8-sig')))
    # the reader does not carry the source workbook on the paste; the issues
    # sheet carries it per flagged row, and the summary is counted from it
    wb = openpyxl.Workbook()
    ws = wb.active; ws.title = 'Base Format'
    bold = Font(bold=True); red = Font(bold=True, color='9C0006'); grey = PatternFill('solid', fgColor='EEEEEE')
    ws.append(['Base format of officers and employees, Jangaon District — compiled from the workbooks returned by the offices on ' + datetime.date.today().strftime('%d.%m.%Y') + '. One row an employee. Columns as in the Base Format; mandatory headings in red.'])
    ws.append(CODES)
    ws.append(HEADINGS)
    for c in range(1, len(CODES) + 1):
        ws.cell(row=2, column=c).font = bold; ws.cell(row=2, column=c).fill = grey
        ws.cell(row=3, column=c).font = red if CODES[c-1] in ('A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','B6','B7','B8','B12','B13','B14','C1','C2','C3','D1','D2','D3','D4','D8','D9') else bold
        ws.cell(row=3, column=c).alignment = Alignment(wrap_text=True, vertical='top')
    ix = {c: i for i, c in enumerate(head)}
    for r in data:
        out = []
        for c in CODES:
            v = r[ix[c]] if c in ix and ix[c] < len(r) else ''
            if c in DATES: v = to_date(v)
            elif c in NUMS and re.match(r'^-?\d+(\.\d+)?$', v or ''): v = float(v) if '.' in v else int(v)
            elif c == 'A5' and re.match(r'^\d{10}$', v or ''): v = int(v)
            out.append(v if v != '' else None)
        ws.append(out)
    for c in CODES:
        col = openpyxl.utils.get_column_letter(CODES.index(c) + 1)
        ws.column_dimensions[col].width = 14 if c in DATES or c in NUMS else 26
        if c in DATES:
            for cell in ws[col][3:]: cell.number_format = 'DD-MM-YYYY'
    ws.freeze_panes = 'C4'
    ws.row_dimensions[3].height = 60
    # issues
    wi = wb.create_sheet('Issues')
    for i, r in enumerate(issues):
        wi.append(r)
        if i == 0:
            for c in range(1, len(r) + 1): wi.cell(row=1, column=c).font = bold
    for col, w in zip('ABCDEF', (42, 6, 28, 14, 22, 90)): wi.column_dimensions[col].width = w
    wi.freeze_panes = 'A2'
    # summary by office, from the per-workbook counts the reader printed into the issues sheet and the paste
    ws3 = wb.create_sheet('Summary')
    ws3.append(['Workbook', 'Lines flagged', 'Refused', 'Added incomplete', 'Not read'])
    for c in range(1, 6): ws3.cell(row=1, column=c).font = bold
    per = {}
    for r in issues[1:]:
        k = r[0]; p = per.setdefault(k, [0, 0, 0, 0]); p[0] += 1
        if r[4].startswith('REFUSED'): p[1] += 1
        elif r[4].startswith('ADDED'): p[2] += 1
        elif r[4].startswith('NOT READ'): p[3] += 1
    for k in sorted(per): ws3.append([k] + per[k])
    ws3.append([]); ws3.append(['Employees on the Base Format sheet', len(data)])
    ws3.append(['Lines on the Issues sheet', len(issues) - 1])
    ws3.column_dimensions['A'].width = 60
    out = os.path.join(D, '_ALL-EMPLOYEES.xlsx')
    wb.save(out)
    print('written', out, '—', len(data), 'employees,', len(issues) - 1, 'issue lines')

if __name__ == '__main__':
    cmd = (sys.argv[1] if len(sys.argv) > 1 else 'compile')
    convert() if cmd == 'convert' else compile_()
