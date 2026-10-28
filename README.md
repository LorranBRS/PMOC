# PMOC – Gestão de manutenção

Site para o técnico preencher o **PMOC (Plano de Manutenção, Operação e Controle)** em campo, gerar o relatório em **PDF** e **compartilhar** por WhatsApp, e-mail ou outro app.

**Acesse:** https://lorranbrs.github.io/PMOC/

## Como usar

1. **Unidade:** identificação do ambiente e do proprietário.
2. **Técnico:** responsável técnico, ART/TRT e dados da visita (mensal, trimestral, semestral ou anual).
3. **Ambientes:** ambientes climatizados e inventário de equipamentos.
4. **Checklist:** itens da Portaria MS 3.523/1998 conforme a periodicidade da visita (OK, Corrigido, Pendente, N/A).
5. **Medições:** tensão, corrente, temperaturas e pressões por equipamento.
6. **Finalizar:** observações, recomendações de emergência, assinatura, PDF e compartilhamento.

- Os dados ficam salvos **no próprio aparelho** (navegador).
- **Nova visita** reaproveita unidade, técnico e equipamentos e zera o checklist.
- No celular, **Compartilhar** abre a lista de apps (WhatsApp, Gmail, Drive…) já com o PDF anexado. No computador, o PDF é baixado para ser anexado manualmente.

## Tecnologia

HTML, CSS e JavaScript puros, sem build. PDF gerado no navegador com [jsPDF](https://github.com/parallax/jsPDF) e [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable). Hospedado no GitHub Pages.

Referências: Lei 13.589/2018 e Portaria MS 3.523/1998.
