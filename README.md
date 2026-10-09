# Classificação dos itens da inspeção

> Os itens do checklist não são, por si só, RF ou RNF. Eles representam o que será verificado. O RF/RNF descreve o comportamento esperado do sistema.

## Requisitos Funcionais (RF)

| Item | Classificação | O sistema deve... |
|---|---|---|
| Calibragem dos pneus | RF | Registrar a pressão de cada pneu e verificar os limites |
| Cortes, rasgos e bolhas | RF | Registrar a condição de cada pneu |
| Desgaste dos pneus | RF | Registrar e avaliar a condição |
| Freios | RF | Registrar o resultado da verificação |
| Direção | RF | Registrar o resultado da verificação |
| Nível de óleo | RF | Registrar a medição e verificar o limite |
| Líquido de arrefecimento | RF | Registrar e verificar a condição |
| Vazamentos | RF | Registrar a ocorrência |
| Iluminação | RF | Registrar cada item como conforme ou não conforme |
| Buzina | RF | Registrar o resultado do teste |
| Giroflex | RF | Registrar o resultado do teste |
| Estrutura/chassi | RF | Registrar danos ou anormalidades |
| Caçamba/implemento | RF | Registrar a condição |
| Cinto de segurança | RF | Registrar a verificação |
| Extintor | RF | Registrar validade e condição |
| Câmera de ré | RF | Registrar o funcionamento |
| Alarme de ré | RF | Registrar o funcionamento |
| Horímetro/odômetro | RF | Registrar a leitura |
| Combustível | RF | Registrar o nível |
| Fotos | RF | Permitir anexar fotos às não conformidades |
| Não conformidade | RF | Registrar o problema encontrado |
| Ordem de serviço | RF | Abrir uma OS quando houver necessidade de manutenção |
| Aptidão para rodar | RF | Determinar/registrar se o equipamento está apto ou não |

## Requisitos Não Funcionais (RNF)

| Categoria | Classificação | Exemplo |
|---|---|---|
| Usabilidade | RNF | O sistema deve ser simples de utilizar pelo operador em campo |
| Desempenho | RNF | O sistema deve registrar uma resposta em até 2 segundos |
| Disponibilidade | RNF | O sistema deve restabelecer a disponibilidade em até 5 segundos após uma falha |
| Segurança | RNF | Somente usuários autorizados podem alterar uma inspeção concluída |
| Rastreabilidade | RNF | O sistema deve registrar usuário, data e hora das alterações |
| Operação offline | RNF | O sistema deve permitir inspeções sem conexão e sincronizar posteriormente |
| Integridade | RNF | O sistema deve impedir alterações não rastreadas em inspeções encerradas |
| Compatibilidade | RNF | O sistema deve funcionar nos dispositivos definidos para a operação |

## Executar a aplicação com o backend

O servidor Node hospeda a interface, gera o PDF ao salvar a inspeção e tenta enviá-lo aos e-mails e números de WhatsApp dos administradores cadastrados.

1. Instale Node.js 22 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e preencha as configurações disponíveis.
4. Execute `npm start` e abra `http://localhost:8000`.

### Configurar e-mail

Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM` com os dados SMTP do provedor de e-mail. O relatório é enviado como anexo PDF.

### Configurar WhatsApp

Preencha `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` com os dados da WhatsApp Business Cloud API. O backend carrega o PDF para a API e envia o documento a cada administrador com telefone cadastrado.

O cadastro no app deve incluir o telefone com código do país e DDD, por exemplo `+55 11 99999-9999`. Sem as configurações de um canal, o relatório ainda é gerado e baixado e o app informa que o canal está sem configuração.

As credenciais devem ficar somente no `.env` local ou no gerenciador de segredos do servidor de produção; não as publique no repositório.
