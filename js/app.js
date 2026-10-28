(() => {
  'use strict';

  const STORAGE_KEY = 'pmoc.registros.v1';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let registros = carregar();
  let atual = null;
  let saveTimer = null;

  // ---------- armazenamento ----------
  function carregar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persistir() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
      setSaveState('Salvo');
    } catch (e) {
      setSaveState('Não foi possível salvar neste aparelho');
    }
  }

  function agendarSalvar() {
    if (!atual) return;
    atual.atualizadoEm = new Date().toISOString();
    setSaveState('Salvando…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistir, 400);
  }

  function setSaveState(txt) { $('#saveState').textContent = txt; }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function hoje() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function novoRegistro(base) {
    const agora = new Date().toISOString();
    return {
      id: uid(),
      criadoEm: agora,
      atualizadoEm: agora,
      unidade: base ? { ...base.unidade } : {},
      proprietario: base ? { ...base.proprietario } : {},
      tecnico: base ? { ...base.tecnico } : {},
      ambientes: base ? base.ambientes.map(a => ({ ...a })) : [],
      equipamentos: base ? base.equipamentos.map(e => ({ ...e })) : [],
      visita: { data: hoje(), tipo: 'M', inicio: '', fim: '' },
      checklist: {},
      medicoes: {},
      observacoes: '',
      emergencia: base ? base.emergencia : EMERGENCIA_PADRAO,
      assinatura: '',
    };
  }

  // ---------- utilidades de caminho ----------
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  }

  function fmtData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------- views ----------
  function mostrarLista() {
    atual = null;
    $('#viewEditor').hidden = true;
    $('#viewLista').hidden = false;
    setSaveState('');
    renderLista();
    window.scrollTo(0, 0);
  }

  function abrirEditor(id) {
    atual = registros.find(r => r.id === id);
    if (!atual) return mostrarLista();
    $('#viewLista').hidden = true;
    $('#viewEditor').hidden = false;
    preencherCampos();
    renderAmbientes();
    renderEquipamentos();
    renderChecklist();
    renderMedicoes();
    assinatura.carregar(atual.assinatura);
    irPara('unidade');
    setSaveState('Salvo');
  }

  function renderLista() {
    const ul = $('#lista');
    const ord = [...registros].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    $('#listaVazia').hidden = ord.length > 0;
    ul.innerHTML = ord.map(r => {
      const { total, feitos } = progresso(r);
      const local = [r.unidade.cidade, r.unidade.uf].filter(Boolean).join(' / ');
      return `<li class="reg">
        <h3>${esc(r.unidade.nome || 'PMOC sem nome')}</h3>
        <div class="meta">${esc(local || 'Local não informado')} · Visita ${PERIODOS[r.visita.tipo].toLowerCase()} em ${fmtData(r.visita.data)}</div>
        <div class="meta">Checklist ${feitos}/${total} · ${r.equipamentos.length} equipamento(s)</div>
        <div class="row-btns">
          <button class="btn small primary" data-abrir="${r.id}" type="button">Abrir</button>
          <button class="btn small" data-pdf="${r.id}" type="button">PDF</button>
          <button class="btn small" data-duplicar="${r.id}" type="button">Nova visita</button>
          <button class="btn small danger" data-excluir="${r.id}" type="button">Excluir</button>
        </div>
      </li>`;
    }).join('');
  }

  // ---------- campos simples ----------
  function preencherCampos() {
    $$('[data-k]').forEach(el => {
      const v = getPath(atual, el.dataset.k);
      el.value = v ?? '';
    });
    atualizarAlertaArt();
  }

  document.addEventListener('input', e => {
    const el = e.target;
    if (!atual || !el.dataset) return;
    if (el.dataset.k) {
      let v = el.value;
      if (el.classList.contains('upper')) v = v.toUpperCase();
      setPath(atual, el.dataset.k, v);
      if (el.dataset.k === 'visita.tipo') renderChecklist();
      if (el.dataset.k.startsWith('tecnico.artValidade') || el.dataset.k === 'visita.data') atualizarAlertaArt();
      agendarSalvar();
    }
  });
  // select dispara 'change' em alguns navegadores sem 'input'
  document.addEventListener('change', e => {
    if (e.target.matches('select[data-k]')) e.target.dispatchEvent(new Event('input', { bubbles: true }));
  });

  function atualizarAlertaArt() {
    const el = $('#alertaArt');
    const val = atual.tecnico.artValidade;
    const ref = atual.visita.data || hoje();
    if (!atual.tecnico.art) {
      el.hidden = false;
      el.textContent = 'Informe a ART/TRT: a Lei 13.589/2018 exige responsável técnico habilitado para o PMOC.';
    } else if (val && val < ref) {
      el.hidden = false;
      el.textContent = `A ART/TRT venceu em ${fmtData(val)}, antes da data da visita. Providencie a renovação.`;
    } else {
      el.hidden = true;
    }
  }

  // ---------- etapas ----------
  function irPara(step) {
    $$('#steps button').forEach(b => b.classList.toggle('active', b.dataset.step === step));
    $$('.step').forEach(s => { s.hidden = s.dataset.panel !== step; });
    const btn = $(`#steps button[data-step="${step}"]`);
    btn && btn.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (step === 'medicoes') renderMedicoes();
    if (step === 'final') { renderPendencias(); assinatura.ajustar(); }
    window.scrollTo(0, 0);
  }

  $('#steps').addEventListener('click', e => {
    const b = e.target.closest('button[data-step]');
    if (b) irPara(b.dataset.step);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) irPara(b.dataset.go);
  });

  // ---------- listas repetíveis ----------
  function campoItem(lista, i, chave, rotulo, tipo = 'text', extra = '') {
    const v = esc(atual[lista][i][chave] ?? '');
    return `<label>${rotulo}<input data-l="${lista}" data-i="${i}" data-c="${chave}" type="${tipo}" value="${v}" ${extra}></label>`;
  }

  function renderAmbientes() {
    $('#ambientes').innerHTML = atual.ambientes.map((a, i) => `
      <div class="item">
        <div class="item-head">Ambiente ${i + 1}<button class="btn danger" data-rm="ambientes" data-i="${i}" type="button">Remover</button></div>
        <div class="grid">
          <label class="col-2">Identificação<input data-l="ambientes" data-i="${i}" data-c="identificacao" value="${esc(a.identificacao)}" placeholder="Ex.: Salas/Divisórias"></label>
          ${campoItem('ambientes', i, 'atividade', 'Tipo de atividade')}
          ${campoItem('ambientes', i, 'area', 'Área (m²)', 'number', 'step="0.01" inputmode="decimal"')}
          ${campoItem('ambientes', i, 'fixos', 'Ocupantes fixos', 'number', 'inputmode="numeric"')}
          ${campoItem('ambientes', i, 'flutuantes', 'Ocupantes flutuantes', 'number', 'inputmode="numeric"')}
          ${campoItem('ambientes', i, 'carga', 'Carga térmica (TR)', 'number', 'step="0.01" inputmode="decimal"')}
        </div>
      </div>`).join('');
    atualizarTotais();
  }

  function atualizarTotais() {
    const soma = k => atual.ambientes.reduce((s, a) => s + (parseFloat(a[k]) || 0), 0);
    const area = soma('area'), carga = soma('carga');
    $('#totaisAmb').textContent = atual.ambientes.length
      ? `Total: ${area.toLocaleString('pt-BR')} m² · ${carga.toLocaleString('pt-BR')} TR · ${(soma('fixos') + soma('flutuantes'))} ocupantes`
      : '';
  }

  function renderEquipamentos() {
    const opts = sel => TIPOS_EQUIP.map(t => `<option ${t === sel ? 'selected' : ''}>${t}</option>`).join('');
    $('#equipamentos').innerHTML = atual.equipamentos.map((q, i) => `
      <div class="item">
        <div class="item-head">${esc(q.tag || 'Equipamento ' + (i + 1))}<button class="btn danger" data-rm="equipamentos" data-i="${i}" type="button">Remover</button></div>
        <div class="grid">
          ${campoItem('equipamentos', i, 'tag', 'TAG / identificação', 'text', 'placeholder="Ex.: AC-01"')}
          <label>Tipo<select data-l="equipamentos" data-i="${i}" data-c="tipo">${opts(q.tipo)}</select></label>
          ${campoItem('equipamentos', i, 'marca', 'Marca')}
          ${campoItem('equipamentos', i, 'modelo', 'Modelo')}
          ${campoItem('equipamentos', i, 'capacidade', 'Capacidade (BTU/h)', 'number', 'inputmode="numeric"')}
          ${campoItem('equipamentos', i, 'local', 'Local instalado')}
          ${campoItem('equipamentos', i, 'serie', 'Nº de série')}
          ${campoItem('equipamentos', i, 'gas', 'Fluido refrigerante', 'text', 'placeholder="Ex.: R-410A"')}
        </div>
      </div>`).join('');
  }

  function onItemInput(e) {
    const el = e.target;
    if (!atual || !el.dataset.l) return;
    atual[el.dataset.l][+el.dataset.i][el.dataset.c] = el.value;
    if (el.dataset.l === 'ambientes') atualizarTotais();
    if (el.dataset.l === 'equipamentos' && el.dataset.c === 'tag') {
      el.closest('.item').querySelector('.item-head').firstChild.textContent = el.value || 'Equipamento ' + (+el.dataset.i + 1);
    }
    agendarSalvar();
  }
  $('#ambientes').addEventListener('input', onItemInput);
  $('#equipamentos').addEventListener('input', onItemInput);
  $('#equipamentos').addEventListener('change', e => { if (e.target.tagName === 'SELECT') onItemInput(e); });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if (!b || !atual) return;
    const lista = b.dataset.rm, i = +b.dataset.i;
    if (!confirm('Remover este item?')) return;
    if (lista === 'equipamentos') {
      const id = atual.equipamentos[i].id;
      delete atual.medicoes[id];
    }
    atual[lista].splice(i, 1);
    lista === 'ambientes' ? renderAmbientes() : renderEquipamentos();
    agendarSalvar();
  });

  $('#addAmbiente').addEventListener('click', () => {
    atual.ambientes.push({ atividade: '', identificacao: '', fixos: '', flutuantes: '', area: '', carga: '' });
    renderAmbientes();
    agendarSalvar();
  });
  $('#addEquip').addEventListener('click', () => {
    const n = atual.equipamentos.length + 1;
    atual.equipamentos.push({ id: uid(), tag: 'AC-' + String(n).padStart(2, '0'), tipo: TIPOS_EQUIP[0] });
    renderEquipamentos();
    agendarSalvar();
  });

  // ---------- checklist ----------
  function itensDaVisita(reg) {
    const nivel = PERIODO_NIVEL[reg.visita.tipo] || 1;
    return CHECKLIST
      .map(s => ({ secao: s.secao, itens: s.itens.filter(([, , p]) => PERIODO_NIVEL[p] <= nivel) }))
      .filter(s => s.itens.length);
  }

  function progresso(reg) {
    const itens = itensDaVisita(reg).flatMap(s => s.itens);
    const feitos = itens.filter(([id]) => reg.checklist[id] && reg.checklist[id].status).length;
    const pendentes = itens.filter(([id]) => reg.checklist[id] && reg.checklist[id].status === 'pendente').length;
    return { total: itens.length, feitos, pendentes };
  }

  function renderChecklist() {
    $('#tipoBadge').textContent = PERIODOS[atual.visita.tipo];
    $('#checklist').innerHTML = itensDaVisita(atual).map((s, si) => `
      <div class="card sec">
        <div class="sec-head"><h2>${esc(s.secao)}</h2><button class="btn small" data-todos="${si}" type="button">Tudo OK</button></div>
        ${s.itens.map(([id, desc, per]) => {
          const st = atual.checklist[id] || {};
          return `<div class="ck" data-id="${id}">
            <div class="ck-desc"><span class="ck-id">${id}</span><span>${esc(desc)}</span><span class="ck-per" title="${PERIODOS[per]}">${per}</span></div>
            <div class="seg" role="group" aria-label="Situação do item ${id}">
              ${Object.entries(STATUS).map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${st.status === v}">${l}</button>`).join('')}
            </div>
            <input class="ck-obs" placeholder="Observação" value="${esc(st.obs)}" ${st.status && st.status !== 'ok' || st.obs ? '' : 'hidden'}>
          </div>`;
        }).join('')}
      </div>`).join('');
    atualizarProgresso();
  }

  function atualizarProgresso() {
    const { total, feitos, pendentes } = progresso(atual);
    $('#progressText').textContent = `${feitos}/${total}` + (pendentes ? ` · ${pendentes} pendente(s)` : '');
    $('#progressBar').style.width = total ? (feitos / total * 100) + '%' : '0';
  }

  function marcar(ck, v) {
    const id = ck.dataset.id;
    const st = atual.checklist[id] = atual.checklist[id] || {};
    st.status = st.status === v ? '' : v;
    $$('.seg button', ck).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === st.status));
    const obs = $('.ck-obs', ck);
    if (st.status && st.status !== 'ok') obs.hidden = false;
  }

  $('#checklist').addEventListener('click', e => {
    const b = e.target.closest('.seg button');
    if (b) {
      marcar(b.closest('.ck'), b.dataset.v);
      atualizarProgresso();
      agendarSalvar();
      return;
    }
    const todos = e.target.closest('[data-todos]');
    if (todos) {
      $$('.ck', todos.closest('.sec')).forEach(ck => {
        const st = atual.checklist[ck.dataset.id];
        if (!st || !st.status) marcar(ck, 'ok');
      });
      atualizarProgresso();
      agendarSalvar();
    }
  });
  $('#checklist').addEventListener('input', e => {
    if (!e.target.classList.contains('ck-obs')) return;
    const id = e.target.closest('.ck').dataset.id;
    (atual.checklist[id] = atual.checklist[id] || {}).obs = e.target.value;
    agendarSalvar();
  });

  // ---------- medições ----------
  function deltaT(m) {
    const r = parseFloat(m.tRetorno), i = parseFloat(m.tInsufl);
    return isFinite(r) && isFinite(i) ? (r - i).toFixed(1).replace('.', ',') : null;
  }

  function renderMedicoes() {
    $('#medicoes').innerHTML = atual.equipamentos.map(q => {
      const m = atual.medicoes[q.id] || {};
      const d = deltaT(m);
      return `<div class="item" data-eq="${q.id}">
        <div class="item-head">${esc(q.tag || 'Equipamento')} <span class="muted">${esc([q.tipo, q.local].filter(Boolean).join(' · '))}</span></div>
        <div class="grid">
          ${MEDICOES.map(([k, l]) => `<label>${l}<input data-m="${k}" type="number" step="0.1" inputmode="decimal" value="${esc(m[k])}"></label>`).join('')}
          <span class="delta">${d ? 'ΔT = ' + d + ' °C' : ''}</span>
        </div>
      </div>`;
    }).join('');
  }

  $('#medicoes').addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset.m) return;
    const box = el.closest('[data-eq]');
    const m = atual.medicoes[box.dataset.eq] = atual.medicoes[box.dataset.eq] || {};
    m[el.dataset.m] = el.value;
    const d = deltaT(m);
    $('.delta', box).textContent = d ? 'ΔT = ' + d + ' °C' : '';
    agendarSalvar();
  });

  // ---------- assinatura ----------
  const assinatura = (() => {
    const cv = $('#assinatura');
    const ctx = cv.getContext('2d');
    let desenhando = false, sujo = false;

    function ajustar() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const ratio = window.devicePixelRatio || 1;
      const w = Math.round(r.width * ratio), h = Math.round(r.height * ratio);
      if (cv.width === w && cv.height === h) return;
      cv.width = w; cv.height = h;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      carregar(atual && atual.assinatura);
    }

    function estilo() {
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10243a';
    }

    function carregar(dataUrl) {
      // usa o tamanho do canvas, pois ele pode estar oculto (sem medidas na tela)
      const ratio = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      sujo = !!dataUrl;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cv.width / ratio, cv.height / ratio);
      img.src = dataUrl;
    }

    function pos(e) {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    cv.addEventListener('pointerdown', e => {
      desenhando = true; sujo = true;
      cv.setPointerCapture(e.pointerId);
      estilo();
      ctx.beginPath();
      ctx.moveTo(...pos(e));
    });
    cv.addEventListener('pointermove', e => {
      if (!desenhando) return;
      ctx.lineTo(...pos(e));
      ctx.stroke();
    });
    const fim = () => {
      if (!desenhando) return;
      desenhando = false;
      if (atual) { atual.assinatura = sujo ? cv.toDataURL('image/png') : ''; agendarSalvar(); renderPendencias(); }
    };
    cv.addEventListener('pointerup', fim);
    cv.addEventListener('pointercancel', fim);
    window.addEventListener('resize', () => { if (!$('#viewEditor').hidden) ajustar(); });

    $('#limparAss').addEventListener('click', () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      sujo = false;
      atual.assinatura = '';
      agendarSalvar();
      renderPendencias();
    });

    return { ajustar, carregar };
  })();

  // ---------- pendências antes do PDF ----------
  function renderPendencias() {
    const avisos = [];
    if (!atual.unidade.nome) avisos.push('Informe o nome da unidade (etapa 1).');
    if (!atual.tecnico.nome) avisos.push('Informe o responsável técnico (etapa 2).');
    if (!atual.tecnico.art) avisos.push('Informe a ART/TRT do responsável técnico (etapa 2).');
    else if (atual.tecnico.artValidade && atual.tecnico.artValidade < (atual.visita.data || hoje())) avisos.push('A ART/TRT está vencida na data da visita.');
    if (!atual.equipamentos.length) avisos.push('Cadastre ao menos um equipamento (etapa 3).');
    const { total, feitos, pendentes } = progresso(atual);
    if (feitos < total) avisos.push(`Checklist incompleto: ${total - feitos} item(ns) sem resposta.`);
    if (pendentes) avisos.push(`${pendentes} item(ns) do checklist marcado(s) como pendente.`);
    if (!atual.assinatura) avisos.push('Falta a assinatura do técnico.');
    $('#pendencias').innerHTML = avisos.length
      ? avisos.map(a => `<li>${esc(a)}</li>`).join('')
      : '<li class="ok">Tudo preenchido. O relatório está pronto.</li>';
  }

  // ---------- PDF e compartilhamento ----------
  function pdfDisponivel() {
    if (window.jspdf && window.jspdf.jsPDF) return true;
    toast('Não foi possível carregar o gerador de PDF. Verifique a internet e recarregue a página.');
    return false;
  }

  function baixar(reg) {
    if (!pdfDisponivel()) return;
    const doc = gerarPdf(reg);
    doc.save(nomeArquivoPdf(reg));
    toast('PDF gerado.');
  }

  function textoMensagem(reg) {
    const u = reg.unidade.nome || 'unidade';
    return `Relatório PMOC – ${u} – visita ${PERIODOS[reg.visita.tipo].toLowerCase()} de ${fmtData(reg.visita.data)}.` +
      (reg.tecnico.nome ? ` Responsável técnico: ${reg.tecnico.nome}.` : '');
  }

  // Tenta abrir a folha de compartilhamento do aparelho com o PDF anexado.
  async function compartilharArquivo(reg) {
    if (!pdfDisponivel()) return 'erro';
    const blob = gerarPdf(reg).output('blob');
    const file = new File([blob], nomeArquivoPdf(reg), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Relatório PMOC', text: textoMensagem(reg) });
        return 'ok';
      } catch (e) {
        return e.name === 'AbortError' ? 'cancelado' : 'erro';
      }
    }
    return 'sem-suporte';
  }

  $('#btnPdf').addEventListener('click', () => baixar(atual));

  $('#btnShare').addEventListener('click', async () => {
    const r = await compartilharArquivo(atual);
    if (r === 'sem-suporte') {
      baixar(atual);
      $('#shareHint').textContent = 'Este navegador não permite anexar arquivos ao compartilhar. O PDF foi baixado: use os botões WhatsApp ou E-mail e anexe o arquivo.';
    }
  });

  $('#btnWhats').addEventListener('click', async () => {
    const r = await compartilharArquivo(atual);
    if (r !== 'sem-suporte') return;
    baixar(atual);
    const tel = (atual.unidade.telefone || '').replace(/\D/g, '');
    const destino = tel.length >= 10 ? '55' + tel.replace(/^55/, '') : '';
    const msg = textoMensagem(atual) + ' (PDF em anexo)';
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    $('#shareHint').textContent = 'O PDF foi baixado. No WhatsApp, toque no clipe e anexe o arquivo da pasta Downloads.';
  });

  $('#btnEmail').addEventListener('click', async () => {
    const r = await compartilharArquivo(atual);
    if (r !== 'sem-suporte') return;
    baixar(atual);
    const assunto = `Relatório PMOC – ${atual.unidade.nome || ''} – ${fmtData(atual.visita.data)}`;
    const corpo = textoMensagem(atual) + '\n\nSegue o relatório em anexo.';
    location.href = `mailto:${encodeURIComponent(atual.unidade.email || '')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    $('#shareHint').textContent = 'O PDF foi baixado. Anexe o arquivo ao e-mail antes de enviar.';
  });

  if (!(navigator.canShare)) {
    $('#shareHint').textContent = 'Dica: no celular, "Compartilhar" envia o PDF direto para WhatsApp, Gmail, Drive etc.';
  }

  // ---------- ações da lista ----------
  $('#btnNovo').addEventListener('click', () => {
    const r = novoRegistro();
    registros.push(r);
    persistir();
    abrirEditor(r.id);
  });

  $('#lista').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.dataset.abrir || b.dataset.pdf || b.dataset.duplicar || b.dataset.excluir;
    const reg = registros.find(r => r.id === id);
    if (!reg) return;
    if (b.dataset.abrir) abrirEditor(id);
    else if (b.dataset.pdf) baixar(reg);
    else if (b.dataset.duplicar) novaVisita(reg);
    else if (b.dataset.excluir && confirm(`Excluir o PMOC "${reg.unidade.nome || 'sem nome'}"? Esta ação não pode ser desfeita.`)) {
      registros = registros.filter(r => r.id !== id);
      persistir();
      renderLista();
    }
  });

  function novaVisita(base) {
    const r = novoRegistro(base);
    registros.push(r);
    persistir();
    abrirEditor(r.id);
    toast('Nova visita criada com os dados da unidade, técnico e equipamentos.');
  }

  $('#btnNovaVisita').addEventListener('click', () => novaVisita(atual));
  $('#btnHome').addEventListener('click', mostrarLista);

  // ---------- backup ----------
  $('#btnExportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'pmoc', versao: 1, registros }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pmoc-backup-${hoje()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#inpImportar').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const dados = JSON.parse(await f.text());
      const lista = Array.isArray(dados) ? dados : dados.registros;
      if (!Array.isArray(lista)) throw new Error('formato');
      let novos = 0;
      lista.forEach(r => {
        if (!r || !r.id) return;
        const i = registros.findIndex(x => x.id === r.id);
        if (i >= 0) registros[i] = r; else { registros.push(r); novos++; }
      });
      persistir();
      renderLista();
      toast(`Backup importado: ${lista.length} registro(s), ${novos} novo(s).`);
    } catch (err) {
      toast('Arquivo inválido. Use um backup exportado por este site.');
    }
  });

  mostrarLista();
})();
