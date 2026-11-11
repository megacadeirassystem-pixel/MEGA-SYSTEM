import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const stages = ["SERRALHERIA","PINTURA","USINAGEM","TAPECARIA","COSTURA","MONTAGEM"] as const;
const labels: Record<string,string[]> = {
SERRALHERIA:["Separar tubos e perfis","Cortar conforme plano de corte","Soldar estruturas","Conferir esquadro e medidas","Liberar lote para pintura"],
PINTURA:["Receber e conferir estruturas","Preparar superfície","Aplicar pintura","Inspecionar acabamento","Liberar peças"],
USINAGEM:["Separar chapas e materiais","EXECUTAR USINAGEM CNC","Conferir peças usinadas"],
TAPECARIA:["Separar espumas e componentes","Preparar conjuntos","Conferir medidas e padrão","Liberar para costura/montagem"],
COSTURA:["Separar tecidos e insumos","Cortar revestimentos","Costurar capas","Inspecionar costuras"],
MONTAGEM:["Conferir todos os componentes","Montar produto","Realizar inspeção final","Embalar e identificar","Liberar produto acabado"]};
export async function GET() {
 try {
  const rows = await prisma.$queryRaw<any[]>`
   SELECT op.id,op.codigo,op."pedidoId",p.codigo AS pedido_codigo,p.cliente,op.quantidade,
    op.status::text AS status,pr.nome AS produto,pr.sku,e.etapa,e.status AS etapa_status,
    e.quantidade_planejada,e.quantidade_concluida,e.checklist
   FROM public.ordens_producao op
   JOIN public.pedidos p ON p.id=op."pedidoId"
   JOIN public.produtos pr ON pr.id=op."produtoId"
   LEFT JOIN public.ordem_producao_etapas e ON e.ordem_producao_id=op.id
   ORDER BY op."criadaEm" DESC,op.codigo,e.etapa
  `;
  const map=new Map<string,any>();
  for(const r of rows){if(!map.has(r.id))map.set(r.id,{id:r.id,code:r.codigo,pedido:r.pedido_codigo,client:r.cliente,quantity:r.quantidade,product:r.produto,sku:r.sku,status:r.status,stages:[]});if(r.etapa)map.get(r.id).stages.push({key:r.etapa,status:r.etapa_status,planned:r.quantidade_planejada,completed:r.quantidade_concluida,checks:r.checklist??labels[r.etapa].map(label=>({label,done:false}))});}
  return NextResponse.json({orders:[...map.values()],stageDefinitions:labels});
 } catch(error){console.error("[GET /api/producao/ordens]",error);return NextResponse.json({error:"Não foi possível carregar as ordens reais."},{status:500});}
}
export async function PATCH(request:Request){
 try{
  const body=await request.json();const {orderId,stage,completed,checks,start}=body??{};
  if(!orderId||!stages.includes(stage))return NextResponse.json({error:"Ordem ou etapa inválida."},{status:400});
  const order=await prisma.$queryRaw<any[]>`SELECT id,quantidade FROM public.ordens_producao WHERE id=${orderId} LIMIT 1`;
  if(!order.length)return NextResponse.json({error:"Ordem não encontrada."},{status:404});
  const planned=Number(order[0].quantidade);
  const existing=await prisma.$queryRaw<any[]>`SELECT checklist,quantidade_concluida FROM public.ordem_producao_etapas WHERE ordem_producao_id=${orderId} AND etapa=${stage} LIMIT 1`;
  const savedChecks=Array.isArray(checks)?checks:(existing[0]?.checklist??labels[stage].map(label=>({label,done:false})));
  const qty=completed===undefined?Number(existing[0]?.quantidade_concluida??0):Number(completed);
  if(!Number.isInteger(qty)||qty<0||qty>planned)return NextResponse.json({error:"Quantidade concluída inválida."},{status:400});
  if(!Array.isArray(savedChecks)||savedChecks.some((c:any)=>typeof c.label!=="string"||typeof c.done!=="boolean"))return NextResponse.json({error:"Checklist inválido."},{status:400});
  const done=savedChecks.length>0&&savedChecks.every((c:any)=>c.done);
  const status=done&&qty===planned?"CONCLUIDA":(start||qty>0||savedChecks.some((c:any)=>c.done)?"EM_ANDAMENTO":"PENDENTE");
  await prisma.$executeRaw`
   INSERT INTO public.ordem_producao_etapas(id,ordem_producao_id,etapa,status,quantidade_planejada,quantidade_concluida,checklist,criado_em,atualizado_em)
   VALUES(gen_random_uuid(),${orderId},${stage},${status},${planned},${qty},${JSON.stringify(savedChecks)}::jsonb,NOW(),NOW())
   ON CONFLICT(ordem_producao_id,etapa) DO UPDATE SET status=EXCLUDED.status,quantidade_planejada=EXCLUDED.quantidade_planejada,quantidade_concluida=EXCLUDED.quantidade_concluida,checklist=EXCLUDED.checklist,atualizado_em=NOW()
  `;
  return NextResponse.json({ok:true,status,completed:qty});
 }catch(error){console.error("[PATCH /api/producao/ordens]",error);return NextResponse.json({error:"Falha ao salvar apontamento."},{status:500});}
}