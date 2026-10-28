// Geração do relatório PMOC em PDF (jsPDF + jspdf-autotable).
const COR_PRIMARIA = [11, 92, 107];
const COR_STATUS = {
  ok: [31, 138, 76],
  corrigido: [47, 111, 208],
  pendente: [194, 65, 12],
  na: [123, 138, 145],
};

function nomeArquivoPdf(reg) {
  const base = (reg.unidade.nome || 'unidade')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `PMOC-${base}-${reg.visita.data || 'sem-data'}.pdf`;
}

function gerarPdf(reg) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 14;
  const W = doc.internal.pageSize.getWidth();
  const v = x => (x === undefined || x === null || x === '' ? '—' : String(x));
  const data = iso => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  const num = x => (x === '' || x == null || isNaN(parseFloat(x)) ? '—' : parseFloat(x).toLocaleString('pt-BR'));

  // ---- cabeçalho ----
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PMOC - PLANO DE MANUTENÇÃO, OPERAÇÃO E CONTROLE', M, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Relatório de visita ${PERIODOS[reg.visita.tipo].toLowerCase()} · ${data(reg.visita.data)}` +
    (reg.visita.inicio ? ` · ${reg.visita.inicio}${reg.visita.fim ? ' às ' + reg.visita.fim : ''}` : ''), M, 18);
  doc.text('Lei 13.589/2018 · Portaria MS 3.523/1998', W - M, 18, { align: 'right' });
  doc.setTextColor(20);

  let y = 32;

  const titulo = txt => {
    if (y > 265) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COR_PRIMARIA);
    doc.text(txt.toUpperCase(), M, y);
    doc.setTextColor(20);
    y += 2;
  };

  const base = {
    margin: { left: M, right: M, top: 16, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, lineColor: [214, 224, 227], lineWidth: 0.2, textColor: 20 },
    headStyles: { fillColor: [238, 243, 244], textColor: 40, fontStyle: 'bold' },
  };

  // Tabela de pares rótulo/valor em 4 colunas.
  const pares = (lista) => {
    const linhas = [];
    for (let i = 0; i < lista.length; i += 2) {
      const a = lista[i], b = lista[i + 1] || ['', ''];
      linhas.push([a[0], v(a[1]), b[0], b[0] ? v(b[1]) : '']);
    }
    doc.autoTable({
      ...base,
      startY: y,
      body: linhas,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [246, 249, 250], cellWidth: 30 },
        1: { cellWidth: (W - 2 * M - 60) / 2 },
        2: { fontStyle: 'bold', fillColor: [246, 249, 250], cellWidth: 30 },
        3: { cellWidth: (W - 2 * M - 60) / 2 },
      },
    });
    y = doc.lastAutoTable.finalY + 7;
  };

  const u = reg.unidade, p = reg.proprietario, t = reg.tecnico;

  titulo('1 - Identificação do ambiente');
  pares([
    ['Unidade', u.nome],
    ['Telefone', u.telefone],
    ['Endereço', [u.endereco, u.numero].filter(Boolean).join(', ')],
    ['Complemento', u.complemento],
    ['Bairro', u.bairro],
    ['Cidade / UF', [u.cidade, u.uf].filter(Boolean).join(' / ')],
    ['CEP', u.cep],
    ['E-mail', u.email],
  ]);

  titulo('2 - Proprietário, locatário ou preposto');
  pares([
    ['Nome / razão social', p.nome],
    ['CNPJ / CPF', p.documento],
    ['Endereço', p.endereco],
    ['Cidade / UF', p.cidade],
  ]);

  titulo('3 - Responsável técnico');
  pares([
    ['Nome', t.nome],
    ['CPF', t.cpf],
    ['Registro', t.registro],
    ['ART / TRT', t.art],
    ['Validade ART', data(t.artValidade)],
    ['Empresa', t.empresa],
    ['Telefone', t.telefone],
    ['E-mail', t.email],
  ]);

  titulo('4 - Ambientes climatizados');
  if (reg.ambientes.length) {
    const soma = k => reg.ambientes.reduce((s, a) => s + (parseFloat(a[k]) || 0), 0);
    doc.autoTable({
      ...base,
      startY: y,
      head: [['Identificação', 'Atividade', 'Fixos', 'Flutuantes', 'Área (m²)', 'Carga (TR)']],
      body: reg.ambientes.map(a => [v(a.identificacao), v(a.atividade), num(a.fixos), num(a.flutuantes), num(a.area), num(a.carga)]),
      foot: [['Total', '', num(soma('fixos')), num(soma('flutuantes')), num(soma('area')), num(soma('carga'))]],
      footStyles: { fillColor: [238, 243, 244], textColor: 20, fontStyle: 'bold' },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 7;
  } else {
    semDados();
  }

  titulo('5 - Inventário de equipamentos');
  if (reg.equipamentos.length) {
    doc.autoTable({
      ...base,
      startY: y,
      head: [['TAG', 'Tipo', 'Marca / modelo', 'BTU/h', 'Fluido', 'Local', 'Nº série']],
      body: reg.equipamentos.map(q => [v(q.tag), v(q.tipo), v([q.marca, q.modelo].filter(Boolean).join(' ')), num(q.capacidade), v(q.gas), v(q.local), v(q.serie)]),
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 7;
  } else {
    semDados();
  }

  // ---- checklist ----
  titulo(`6 - Checklist de manutenção (${PERIODOS[reg.visita.tipo].toLowerCase()})`);
  const nivel = PERIODO_NIVEL[reg.visita.tipo] || 1;
  const corpo = [];
  CHECKLIST.forEach(s => {
    const itens = s.itens.filter(([, , per]) => PERIODO_NIVEL[per] <= nivel);
    if (!itens.length) return;
    corpo.push([{ content: s.secao, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [246, 249, 250] } }]);
    itens.forEach(([id, desc, per]) => {
      const st = reg.checklist[id] || {};
      corpo.push([id, desc, per, st.status ? STATUS[st.status] : '—', st.obs || '']);
    });
  });
  doc.autoTable({
    ...base,
    startY: y,
    head: [['Item', 'Serviço', 'Per.', 'Situação', 'Observação']],
    body: corpo,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 11 },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 21, fontStyle: 'bold' },
      4: { cellWidth: 48 },
    },
    didParseCell: d => {
      if (d.section !== 'body' || d.column.index !== 3) return;
      const chave = Object.keys(STATUS).find(k => STATUS[k] === d.cell.raw);
      if (chave) d.cell.styles.textColor = COR_STATUS[chave];
    },
  });
  y = doc.lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text('Periodicidade: M mensal · T trimestral · S semestral · A anual', M, y);
  doc.setTextColor(20);
  y += 8;

  // ---- medições ----
  titulo('7 - Medições');
  const comMedicao = reg.equipamentos.filter(q => reg.medicoes[q.id] && Object.values(reg.medicoes[q.id]).some(x => x !== ''));
  if (comMedicao.length) {
    doc.autoTable({
      ...base,
      startY: y,
      head: [['TAG', 'Tensão (V)', 'Corrente (A)', 'T. insufl. (°C)', 'T. retorno (°C)', 'Dif. T (°C)', 'T. ext. (°C)', 'P. sucção (psi)', 'P. desc. (psi)']],
      body: comMedicao.map(q => {
        const m = reg.medicoes[q.id];
        const dt = parseFloat(m.tRetorno) - parseFloat(m.tInsufl);
        return [v(q.tag), num(m.tensao), num(m.corrente), num(m.tInsufl), num(m.tRetorno), isFinite(dt) ? dt.toFixed(1).replace('.', ',') : '—', num(m.tExterna), num(m.pSuccao), num(m.pDescarga)];
      }),
      theme: 'grid',
      styles: { ...base.styles, halign: 'center' },
    });
    y = doc.lastAutoTable.finalY + 7;
  } else {
    semDados();
  }

  // ---- textos ----
  const bloco = (tituloTxt, texto) => {
    titulo(tituloTxt);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const linhas = doc.splitTextToSize(texto || '—', W - 2 * M);
    linhas.forEach(l => {
      if (y > 280) { doc.addPage(); y = 18; }
      y += 4.2;
      doc.text(l, M, y);
    });
    y += 7;
  };

  bloco('8 - Observações da visita', reg.observacoes);
  bloco('9 - Recomendações em caso de falha ou emergência',
    (reg.emergencia || '') + (t.telefone ? `\nContato de manutenção: ${t.nome || ''} · ${t.telefone}` : ''));

  // ---- assinatura ----
  if (y > 240) { doc.addPage(); y = 20; }
  y += 4;
  const cx = W / 2;
  if (reg.assinatura) {
    try { doc.addImage(reg.assinatura, 'PNG', cx - 35, y, 70, 24); } catch (e) { /* assinatura inválida */ }
  }
  y += 26;
  doc.setDrawColor(60);
  doc.line(cx - 45, y, cx + 45, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(v(t.nome), cx, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(['Responsável técnico', [t.registro, t.art && 'ART ' + t.art].filter(Boolean).join(' · ')].filter(Boolean), cx, y + 9.5, { align: 'center' });

  // ---- rodapé ----
  const total = doc.getNumberOfPages();
  const gerado = new Date().toLocaleString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`PMOC · ${u.nome || ''} · gerado em ${gerado}`, M, 290);
    doc.text(`Página ${i} de ${total}`, W - M, 290, { align: 'right' });
  }
  return doc;

  function semDados() {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    doc.text('Não informado.', M, y + 4);
    doc.setTextColor(20);
    y += 11;
  }
}
