// Itens de manutenção baseados no modelo de PMOC da Portaria MS 3.523/1998.
// Periodicidade: M mensal, T trimestral, S semestral, A anual.
const PERIODOS = { M: 'Mensal', T: 'Trimestral', S: 'Semestral', A: 'Anual' };
const PERIODO_NIVEL = { M: 1, T: 2, S: 3, A: 4 };

const CHECKLIST = [
  { secao: 'Filtros de ar', itens: [
    ['1.1', 'Limpar o elemento filtrante ou substituir em caso de avarias', 'M'],
    ['1.2', 'Verificar danos e corrosão do suporte e existência de frestas', 'M'],
    ['1.3', 'Verificar e corrigir o ajuste da moldura na estrutura', 'M'],
  ]},
  { secao: 'Bandejas', itens: [
    ['2.1', 'Verificar obstrução/inclinação para drenagem do condensado', 'M'],
    ['2.2', 'Lavar e remover biofilme com produto biodegradável registrado no Ministério da Saúde', 'T'],
    ['2.3', 'Verificar danos e corrosão', 'T'],
    ['2.4', 'Verificar vazamento e corrigir, se necessário', 'M'],
  ]},
  { secao: 'Evaporadores', itens: [
    ['3.1', 'Lavar e remover biofilme da serpentina com produto biodegradável', 'T'],
    ['3.2', 'Verificar danos e corrosão no aletado e moldura', 'T'],
    ['3.3', 'Desincrustar serpentinas, se necessário', 'S'],
    ['3.4', 'Verificar e limpar a turbina do ventilador', 'M'],
    ['3.5', 'Verificar a drenagem de água da bandeja', 'M'],
    ['3.6', 'Aplicar produto antibactericida na serpentina', 'M'],
    ['3.7', 'Limpeza externa', 'M'],
  ]},
  { secao: 'Gabinetes', itens: [
    ['4.1', 'Lavar externamente', 'M'],
    ['4.2', 'Lavar internamente', 'T'],
    ['4.3', 'Verificar e eliminar danos e corrosão', 'T'],
    ['4.4', 'Verificar vedação dos painéis, fixação e danos', 'M'],
    ['4.5', 'Verificar o isolamento termoacústico', 'M'],
    ['4.6', 'Verificar e eliminar ruídos anormais e vibrações', 'M'],
    ['4.7', 'Verificar o mecanismo de renovação de ar', 'M'],
    ['4.8', 'Verificar botoeiras e controle remoto', 'M'],
  ]},
  { secao: 'Condensadores', itens: [
    ['5.1', 'Lavar e remover incrustações da serpentina com produto biodegradável', 'S'],
    ['5.2', 'Verificar danos e corrosão no aletado, gabinete e moldura', 'T'],
    ['5.3', 'Verificar calços de borracha', 'T'],
    ['5.4', 'Limpeza externa', 'T'],
  ]},
  { secao: 'Ventiladores', itens: [
    ['6.1', 'Verificar e eliminar sujeira, danos e corrosão', 'S'],
    ['6.2', 'Verificar fixação e amortecedores de vibração', 'S'],
    ['6.3', 'Verificar ruído dos mancais e lubrificar, se necessário', 'M'],
  ]},
  { secao: 'Motores elétricos', itens: [
    ['7.1', 'Verificar e corrigir fixação e amortecedores de vibração', 'T'],
    ['7.2', 'Limpar e verificar danos e corrosão', 'T'],
    ['7.3', 'Verificar aterramento', 'T'],
    ['7.4', 'Verificar capacitores', 'M'],
  ]},
  { secao: 'Compressores', itens: [
    ['8.1', 'Verificar e eliminar sujeira, danos e corrosão', 'T'],
    ['8.2', 'Verificar aterramento', 'A'],
    ['8.3', 'Verificar fixação, amortecedores de vibração e ruídos anormais', 'M'],
  ]},
  { secao: 'Circuito refrigerante', itens: [
    ['9.1', 'Verificar fixação, danos e corrosão das tubulações', 'S'],
    ['9.2', 'Verificar o estado dos isolamentos térmicos', 'T'],
    ['9.3', 'Verificar vazamento de gás refrigerante e corrigir', 'M'],
  ]},
  { secao: 'Circuito elétrico', itens: [
    ['10.1', 'Verificar disjuntores, tomadas e plugues', 'M'],
    ['10.2', 'Verificar aperto dos contatos elétricos', 'T'],
  ]},
  { secao: 'Dutos, grelhas e difusores', itens: [
    ['11.1', 'Limpeza externa dos dutos aparentes', 'S'],
    ['11.2', 'Limpeza das grelhas e difusores', 'S'],
    ['11.3', 'Verificar presença de água/umidade nos dutos e acessórios', 'T'],
    ['11.4', 'Verificar isolamento e estanqueidade dos dutos', 'A'],
    ['11.5', 'Regular as vazões de ar (insuflação e retorno)', 'S'],
  ]},
  { secao: 'Tomada de ar exterior', itens: [
    ['12.1', 'Verificar e eliminar sujeira, danos e corrosão', 'M'],
    ['12.2', 'Verificar e eliminar frestas nos filtros e moldura', 'M'],
    ['12.3', 'Verificar a fixação do conjunto', 'M'],
    ['12.4', 'Limpar ou trocar os filtros (máximo 3 meses)', 'M'],
    ['12.5', 'Verificar a regulagem da vazão de ar exterior de projeto', 'T'],
  ]},
  { secao: 'Quadros elétricos', itens: [
    ['13.1', 'Limpeza dos quadros e componentes', 'S'],
    ['13.2', 'Fixação dos componentes e terminais', 'M'],
    ['13.3', 'Contatos das contatoras', 'M'],
    ['13.4', 'Temperatura dos componentes, cabos e terminais', 'M'],
    ['13.5', 'Regulagem dos relés de sobrecarga em relação à corrente nominal', 'M'],
    ['13.6', 'Dispositivos de sinalização e alarme', 'M'],
  ]},
  { secao: 'Testes', itens: [
    ['14.1', 'Termostatos (atuação e regulagem)', 'M'],
    ['14.2', 'Pressostatos de alta e baixa', 'S'],
    ['14.3', 'Relés de sobrecarga e de tempo', 'S'],
    ['14.4', 'Isolamento dos motores dos compressores', 'A'],
  ]},
];

const STATUS = {
  ok: 'OK',
  corrigido: 'Corrigido',
  pendente: 'Pendente',
  na: 'N/A',
};

const TIPOS_EQUIP = ['Split hi-wall', 'Split piso-teto', 'Split cassete', 'Split dutado', 'VRF/VRV', 'Janela (ACJ)', 'Self contained', 'Fancoil', 'Chiller', 'Outro'];

const MEDICOES = [
  ['tensao', 'Tensão (V)'],
  ['corrente', 'Corrente (A)'],
  ['tInsufl', 'T. insuflamento (°C)'],
  ['tRetorno', 'T. retorno (°C)'],
  ['tExterna', 'T. externa (°C)'],
  ['pSuccao', 'P. sucção (psi)'],
  ['pDescarga', 'P. descarga (psi)'],
];

const EMERGENCIA_PADRAO = [
  '1. Em caso de fumaça, cheiro de queimado, faíscas ou ruído anormal, desligue o equipamento no controle e no disjuntor e chame a manutenção.',
  '2. Se houver vazamento de água pelo aparelho, desligue-o e proteja o piso e equipamentos próximos.',
  '3. Em suspeita de vazamento de gás refrigerante, ventile o ambiente, afaste as pessoas e não religue o equipamento.',
  '4. Não abra, desmonte ou tente reparar o equipamento. Não obstrua grelhas, difusores e a unidade externa.',
  '5. Mantenha portas e janelas fechadas com o sistema ligado e não altere o termostato abaixo de 23 °C.',
  '6. Qualquer falha deve ser comunicada ao responsável técnico informado neste plano.',
].join('\n');
