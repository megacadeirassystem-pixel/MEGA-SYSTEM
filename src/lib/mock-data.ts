// Dados de demonstração — prontos pra integração real (Supabase).
export type Status = "ok" | "warn" | "crit";

export const stations = ["Cadastros", "Comercial", "Compras", "Produção", "Estoque", "Logística", "Pós-venda"] as const;
export const stationHrefs = ["/cadastros", "/comercial", "/compras", "/producao", "/estoque", "/logistica", "/posvenda"];

export type Order = {
  code: string;
  cliente: string;
  valor: string;
  station: number;
  status: Status;
};

export const orders: Order[] = [
  { code: "MC-0847", cliente: "Mackenzie", valor: "R$ 42.800", station: 3, status: "warn" },
  { code: "MC-0846", cliente: "Batista Central", valor: "R$ 18.400", station: 5, status: "ok" },
  { code: "MC-0845", cliente: "Blue Tree", valor: "R$ 67.200", station: 1, status: "ok" },
  { code: "MC-0844", cliente: "São Camilo", valor: "R$ 29.600", station: 4, status: "ok" },
  { code: "MC-0843", cliente: "Memorial AL", valor: "R$ 134.000", station: 3, status: "crit" },
  { code: "MC-0841", cliente: "G. Soneto", valor: "R$ 51.300", station: 6, status: "ok" },
  { code: "MC-0840", cliente: "Lemann", valor: "R$ 14.200", station: 1, status: "ok" },
  { code: "MC-0839", cliente: "Rio Branco", valor: "R$ 22.000", station: 0, status: "warn" },
];

export const revenueSeries = [
  { month: "Abr", valor: 58 },
  { month: "Mai", valor: 62 },
  { month: "Jun", valor: 67 },
  { month: "Jul", valor: 71 },
  { month: "Ago", valor: 69 },
  { month: "Set", valor: 78 },
  { month: "Out", valor: 82 },
  { month: "Nov", valor: 96.2 },
];

export const operationalIntel = [
  { title: "Gargalo em Produção", desc: "OF-0409 bloqueada — aguardando chapa MDF", time: "agora", severity: "crit" as Status, href: "/producao" },
  { title: "Fornecedor atrasado", desc: "Compensado 12mm — Madeireira Jundiapeba", time: "2h", severity: "warn" as Status, href: "/compras" },
  { title: "Estoque crítico", desc: "2 itens abaixo do mínimo", time: "hoje", severity: "crit" as Status, href: "/estoque" },
  { title: "Aprovação pendente", desc: "Orçamento MC-0843 aguarda alçada", time: "5h", severity: "warn" as Status, href: "/comercial" },
  { title: "Entrega a roteirizar", desc: "MC-0846 — Mogi das Cruzes", time: "1d", severity: "warn" as Status, href: "/logistica" },
];

export const catalogIndividuais = [
  { produto: "Jerusalém Ouro", obs: "Empilhável, engate lateral", valor: "R$ 279,99" },
  { produto: "Jerusalém", obs: "Estrutura em aço, empilha até 6", valor: "R$ 269,99" },
  { produto: "Jerusalém Plus", obs: "Espuma espessa, acabamento sofisticado", valor: "R$ 310,00" },
  { produto: "Jerusalém com Braço", obs: "Braços em aço carbono", valor: "R$ 299,99" },
  { produto: "ISO Fixa", obs: "Polipropileno de alto impacto", valor: "R$ 125,00" },
  { produto: "POP Personalizada", obs: "Com a marca da congregação", valor: "R$ 169,99" },
  { produto: "Poltrona Presidente", obs: "Encosto alto, costuras decorativas", valor: "R$ 450 / 500" },
  { produto: "Cadeira Diretor", obs: "Espuma injetada, antiferrugem", valor: "R$ 300 / 320" },
];

export const catalogLongarinas = [
  { produto: "Diretor sem braços", obs: "Costuras horizontais", valor: "R$ 230,00 / lugar" },
  { produto: "Secretária", obs: "Estofado liso", valor: "R$ 189,99 / lugar" },
  { produto: "Diretor com braços", obs: "+ R$ 15,00 costura decorativa", valor: "R$ 350,00 / lugar" },
  { produto: "Poltrona Rebatível", obs: "Com braços · + R$ 15,00 costura", valor: "R$ 400,00 / lugar" },
  { produto: "ISO Polipropileno", obs: "Resistente, fácil de limpar", valor: "R$ 150,00 / lugar" },
];

export const catalogUniversitarias = [
  { produto: "Diretor Escamoteável", obs: "Espuma injetada 50mm, gradil porta-livros", valor: "R$ 450,00" },
  { produto: "Hoteleira c/ Prancheta Fixa", obs: "Até 110kg, empilha 8 sem prancheta", valor: "R$ 700,00" },
  { produto: "Executiva Palito", obs: "Espuma 45mm, até 110kg", valor: "R$ 400,00" },
  { produto: "Diretor c/ Prancheta Escamoteável", obs: "Espuma 50/65mm, braço gota", valor: "R$ 480,00" },
  { produto: "Executiva Contínua, Pr. Escamoteável", obs: "Tecido J-Serrano ou courino", valor: "R$ 800,00" },
];

export const clientes = [
  { nome: "Universidade Mackenzie", segmento: "Universidade", cidade: "São Paulo / SP", vendedor: "Carla Souza" },
  { nome: "Igreja Batista Central", segmento: "Igreja", cidade: "Mogi das Cruzes / SP", vendedor: "Marcos Lima" },
  { nome: "Hotel Blue Tree Faria Lima", segmento: "Hotel", cidade: "São Paulo / SP", vendedor: "Carla Souza" },
];

export const pipeline = [
  { etapa: "Lead", total: "R$ 102.000", deals: [
    { nome: "Hotel Transamérica", seg: "Hotel", valor: "R$ 80.000" },
    { nome: "Colégio Rio Branco", seg: "Universidade", valor: "R$ 22.000" },
  ]},
  { etapa: "Orçamento", total: "R$ 139.400", deals: [
    { nome: "Hotel Blue Tree", seg: "Hotel", valor: "R$ 67.200" },
    { nome: "Lemann Advocacia", seg: "Office", valor: "R$ 14.200" },
  ]},
  { etapa: "Negociação", total: "R$ 176.800", deals: [
    { nome: "Universidade Mackenzie", seg: "Universidade", valor: "R$ 42.800" },
    { nome: "Memorial América Latina", seg: "Auditório", valor: "R$ 134.000" },
  ]},
  { etapa: "Ganho", total: "R$ 99.300", deals: [
    { nome: "Igreja Batista Central", seg: "Igreja", valor: "R$ 18.400" },
    { nome: "Faculdade São Camilo", seg: "Universidade", valor: "R$ 29.600" },
  ]},
];

export const comprasAbertas = [
  { material: "Chapa MDF cru 15mm", para: "MC-0847", qtd: "3 chapas", fornecedor: "Madeireira Jundiapeba", status: "warn" as Status, statusLabel: "Cotando" },
  { material: "Tubo de aço 7/8\"", para: "MC-0843", qtd: "40 barras", fornecedor: "Aços Mogi", status: "ok" as Status, statusLabel: "Emitido" },
  { material: "Compensado 12mm", para: "Estoque", qtd: "8 chapas", fornecedor: "Madeireira Jundiapeba", status: "crit" as Status, statusLabel: "Atrasado" },
];

export const ordensProducao = [
  { ordem: "OF-0412", pedido: "MC-0847", pecas: "47 · Universitária", etapa: "Usinagem", status: "warn" as Status, statusLabel: "Em corte" },
  { ordem: "OF-0411", pedido: "MC-0845", pecas: "32 · Longarina", etapa: "Montagem", status: "ok" as Status, statusLabel: "No prazo" },
  { ordem: "OF-0409", pedido: "MC-0843", pecas: "28 · Auditório", etapa: "Aguardando chapa", status: "crit" as Status, statusLabel: "Bloqueado" },
];

export const entregas = [
  { pedido: "MC-0846", destino: "Igreja Batista Central — Mogi das Cruzes/SP", veiculo: "VUC 01", motorista: "Devair Nunes", data: "12/11", status: "warn" as Status, statusLabel: "Roteirizando" },
  { pedido: "MC-0845", destino: "Hotel Blue Tree — São Paulo/SP", veiculo: "Toco 02", motorista: "Josiel Pires", data: "10/11", status: "ok" as Status, statusLabel: "Em rota" },
  { pedido: "MC-0841", destino: "G. Soneto — Suzano/SP", veiculo: "VUC 01", motorista: "Devair Nunes", data: "08/11", status: "crit" as Status, statusLabel: "Atrasada" },
  { pedido: "MC-0839", destino: "Colégio Rio Branco — São Paulo/SP", veiculo: "—", motorista: "—", data: "18/11", status: "warn" as Status, statusLabel: "Aguardando produção" },
];

export const instalacoesAgendadas = [
  { pedido: "MC-0843", cliente: "Memorial América Latina", tecnico: "Equipe Jundiapeba", data: "14/11" },
  { pedido: "MC-0840", cliente: "Lemann Advocacia", tecnico: "Equipe SP Capital", data: "11/11" },
];

export const chamados = [
  { chamado: "PV-0091", cliente: "Hotel Transamérica", produto: "Jerusalém Ouro", tipo: "Assistência técnica", abertoHa: "3 dias", status: "warn" as Status, statusLabel: "Em atendimento" },
  { chamado: "PV-0090", cliente: "Universidade Mackenzie", produto: "Diretor Escamoteável", tipo: "Garantia", abertoHa: "1 dia", status: "warn" as Status, statusLabel: "Aguardando peça" },
  { chamado: "PV-0088", cliente: "Igreja Batista Central", produto: "Jerusalém", tipo: "Reclamação", abertoHa: "6 dias", status: "crit" as Status, statusLabel: "Atrasado" },
  { chamado: "PV-0085", cliente: "Memorial América Latina", produto: "Hoteleira c/ Prancheta Fixa", tipo: "Garantia", abertoHa: "12 dias", status: "ok" as Status, statusLabel: "Resolvido" },
];

export const contasReceber = [
  { ref: "MC-0846 — Igreja Batista Central", vencimento: "15/11", valor: "R$ 18.400", status: "ok" as Status, statusLabel: "No prazo" },
  { ref: "MC-0845 — Hotel Blue Tree", vencimento: "18/11", valor: "R$ 67.200", status: "ok" as Status, statusLabel: "No prazo" },
  { ref: "MC-0841 — G. Soneto", vencimento: "05/11", valor: "R$ 51.300", status: "crit" as Status, statusLabel: "Vencido" },
  { ref: "MC-0840 — Lemann Advocacia", vencimento: "22/11", valor: "R$ 14.200", status: "ok" as Status, statusLabel: "No prazo" },
];

export const contasPagar = [
  { fornecedor: "Madeireira Jundiapeba", valor: "R$ 22.900", status: "warn" as Status, statusLabel: "A vencer" },
  { fornecedor: "Aços Mogi", valor: "R$ 18.600", status: "ok" as Status, statusLabel: "Pago" },
  { fornecedor: "Folha — novembro", valor: "R$ 29.700", status: "warn" as Status, statusLabel: "A vencer" },
];

export const dreResumo = [
  { linha: "Receita bruta", valor: "R$ 96.200", destaque: true },
  { linha: "Custo de matéria-prima", valor: "− R$ 31.400", destaque: false },
  { linha: "Despesas operacionais", valor: "− R$ 18.900", destaque: false },
  { linha: "Margem líquida", valor: "R$ 45.900", destaque: true },
];

export const notasFiscais = [
  { numero: "000.189", pedido: "MC-0846", cliente: "Igreja Batista Central", valor: "R$ 18.400", emissao: "07/11", status: "ok" as Status, statusLabel: "Autorizada" },
  { numero: "000.188", pedido: "MC-0845", cliente: "Hotel Blue Tree", valor: "R$ 67.200", emissao: "05/11", status: "ok" as Status, statusLabel: "Autorizada" },
  { numero: "—", pedido: "MC-0843", cliente: "Memorial América Latina", valor: "R$ 134.000", emissao: "—", status: "warn" as Status, statusLabel: "Aguardando expedição" },
  { numero: "—", pedido: "MC-0841", cliente: "G. Soneto", valor: "R$ 51.300", emissao: "—", status: "warn" as Status, statusLabel: "Pendente" },
];

export const colaboradores = [
  { nome: "Carla Souza", cargo: "Vendedora sênior", setor: "Comercial", admissao: "03/2022", status: "ok" as Status, statusLabel: "Ativo" },
  { nome: "Marcos Lima", cargo: "Vendedor", setor: "Comercial", admissao: "08/2023", status: "ok" as Status, statusLabel: "Ativo" },
  { nome: "Devair Nunes", cargo: "Motorista", setor: "Logística", admissao: "01/2021", status: "ok" as Status, statusLabel: "Ativo" },
  { nome: "Josiel Pires", cargo: "Operador CNC", setor: "Fábrica", admissao: "06/2020", status: "ok" as Status, statusLabel: "Ativo" },
  { nome: "Elaine Ferraz", cargo: "Costureira", setor: "Fábrica", admissao: "11/2026", status: "warn" as Status, statusLabel: "Experiência" },
];

export const comissoes = [
  { vendedor: "Carla Souza", pedidos: 4, valorVendido: "R$ 109.000", comissao: "4%", aReceber: "R$ 4.360" },
  { vendedor: "Marcos Lima", pedidos: 2, valorVendido: "R$ 32.600", comissao: "4%", aReceber: "R$ 1.304" },
];
