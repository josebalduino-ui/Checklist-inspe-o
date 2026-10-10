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

O servidor Node hospeda a interface e gera o PDF para download ao salvar ou exportar a inspeção. O arquivo é gerado localmente pelo servidor e não é enviado por e-mail ou WhatsApp.

1. Instale Node.js 22 ou superior.
2. Execute `npm install`.
3. Execute `supabase/schema.sql` no SQL Editor do projeto Supabase. Se o schema já estava instalado, execute o arquivo novamente para adicionar a coluna de descrição do equipamento.
4. A URL do projeto e a chave pública ficam em `config.js`. A chave `service_role` nunca deve ser colocada nesse arquivo.
5. Ative confirmação por e-mail no Supabase Auth (ou desative-a durante o desenvolvimento) e configure a URL de redirecionamento do site.
6. Execute `npm start` e abra `http://localhost:8000`.

O login e o cadastro usam Supabase Auth. Perfis novos são criados pelo gatilho do schema como `operador`; para promover um administrador, faça isso manualmente no SQL Editor depois do cadastro. Inspeções, respostas, equipamentos, itens personalizados e auditoria são persistidos nas tabelas correspondentes. Fotos usam o bucket privado `inspection-photos`.

