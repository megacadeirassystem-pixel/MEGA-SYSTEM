"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Product = { id:string; sku:string; nome:string; linha:string; precoBase:string|number; bom:{ quantidadePorUnidade:string|number; fatorPerda:string|number; item:{id:string;sku:string;nome:string;unidadeMedida:string;estoque:{saldoAtual:string|number;reservado:string|number}|null} }[] };
type CartLine = { key:number; produtoId:string; quantidade:number; valorUnitario:number; observacao:string };
type Analysis = { subtotal:number; total:number; necessidades:{sku:string;nome:string;unidade:string;necessario:number;disponivel:number;falta:number}[]; linhasSemBOM:string[]; analiseCompleta:boolean };
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);

export default function NovoPedidoPage(){
 const [products,setProducts]=useState<Product[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [cliente,setCliente]=useState("");
 const [tipoPedido,setTipoPedido]=useState("VENDA");
 const [origem,setOrigem]=useState("WHATSAPP");
 const [vendedor,setVendedor]=useState("");
 const [telefoneContato,setTelefone]=useState("");
 const [emailContato,setEmail]=useState("");
 const [enderecoEntrega,setEndereco]=useState("");
 const [dataEntrega,setDataEntrega]=useState("");
 const [condicaoPagamento,setCondicao]=useState("");
 const [frete,setFrete]=useState("0");
 const [desconto,setDesconto]=useState("0");
 const [observacoes,setObservacoes]=useState("");
 const [lines,setLines]=useState<CartLine[]>([{key:1,produtoId:"",quantidade:1,valorUnitario:0,observacao:""}]);
 const [analysis,setAnalysis]=useState<Analysis|null>(null);
 const [pedidoCode,setPedidoCode]=useState("");
 useEffect(()=>{fetch("/api/pedidos").then(async r=>{if(!r.ok)throw new Error("Não foi possível carregar o catálogo.");return r.json()}).then(d=>setProducts(d.produtos)).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));},[]);
 const subtotal=useMemo(()=>lines.reduce((s,l)=>s+l.quantidade*l.valorUnitario,0),[lines]);
 const total=Math.max(0,subtotal+Number(frete||0)-Number(desconto||0));
 function changeLine(key:number,patch:Partial<CartLine>){setLines(prev=>prev.map(l=>l.key===key?{...l,...patch}:l));setAnalysis(null);}
 function addLine(){setLines(p=>[...p,{key:Math.max(0,...p.map(x=>x.key))+1,produtoId:"",quantidade:1,valorUnitario:0,observacao:""}]);}
 async function submit(){
  if(!cliente.trim()||!lines.length||lines.some(l=>!l.produtoId||l.quantidade<1)){toast.error("Informe o cliente e todos os produtos/quantidades.");return;}
  setSaving(true);
  try{
   const response=await fetch("/api/pedidos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cliente,tipoPedido,origem,vendedor,telefoneContato,emailContato,enderecoEntrega,dataEntrega:dataEntrega||undefined,condicaoPagamento,frete:Number(frete),desconto:Number(desconto),observacoes,itens:lines.map(({produtoId,quantidade,valorUnitario,observacao})=>({produtoId,quantidade,valorUnitario,observacao}))})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Falha ao salvar pedido.");
   setAnalysis(data.analise);setPedidoCode(data.pedido.codigo);toast.success(`Pedido ${data.pedido.codigo} salvo como orçamento.`);
  }catch(e){toast.error(e instanceof Error?e.message:"Erro ao salvar.");}finally{setSaving(false);}
 }
 return <div className="space-y-6">
  <PageHeader title="Novo pedido" description="Registre o pedido recebido pelo WhatsApp ou por outro canal. O pedido será salvo como orçamento e terá uma análise preliminar de materiais."/>
  <div><Link href="/comercial" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/> Voltar ao Comercial</Link></div>
  <section className="rounded-xl border bg-card p-5 space-y-4">
   <h2 className="font-semibold">1. Cliente e origem</h2>
   <div className="grid gap-3 md:grid-cols-2">
    <label className="text-sm">Cliente / empresa *<Input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nome do cliente ou instituição" className="mt-1"/></label>
    <label className="text-sm">Telefone / WhatsApp<Input value={telefoneContato} onChange={e=>setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1"/></label>
    <label className="text-sm">E-mail<Input type="email" value={emailContato} onChange={e=>setEmail(e.target.value)} className="mt-1"/></label>
    <label className="text-sm">Origem<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={origem} onChange={e=>setOrigem(e.target.value)}><option value="WHATSAPP">WhatsApp</option><option value="TELEFONE">Telefone</option><option value="EMAIL">E-mail</option><option value="PRESENCIAL">Presencial</option><option value="OUTRO">Outro</option></select></label>
    <label className="text-sm">Tipo de pedido<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={tipoPedido} onChange={e=>setTipoPedido(e.target.value)}><option value="VENDA">Venda normal</option><option value="REPOSICAO">Reposição</option><option value="ENCOMENDA">Encomenda</option><option value="AMOSTRA">Amostra</option></select></label>
    <label className="text-sm">Vendedor responsável<Input value={vendedor} onChange={e=>setVendedor(e.target.value)} placeholder="Nome do vendedor" className="mt-1"/></label>
   </div>
  </section>
  <section className="rounded-xl border bg-card p-5 space-y-4">
   <div className="flex items-center justify-between"><h2 className="font-semibold">2. Produtos do pedido</h2><Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="size-4"/> Adicionar produto</Button></div>
   {loading?<p className="text-sm text-muted-foreground">Carregando catálogo oficial...</p>:products.length===0?<p className="text-sm text-destructive">Nenhum produto ativo retornado pelo catálogo.</p>:null}
   {lines.map((line,index)=><div key={line.key} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(220px,2fr)_100px_140px_1fr_40px] md:items-end">
    <label className="text-sm">Produto {index+1} *<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={line.produtoId} onChange={e=>{const p=products.find(x=>x.id===e.target.value);changeLine(line.key,{produtoId:e.target.value,valorUnitario:Number(p?.precoBase||0)});}}><option value="">Selecione do catálogo...</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.nome} ({p.linha})</option>)}</select></label>
    <label className="text-sm">Quantidade *<Input type="number" min="1" step="1" value={line.quantidade} onChange={e=>changeLine(line.key,{quantidade:Math.max(1,Number(e.target.value))})} className="mt-1"/></label>
    <label className="text-sm">Valor unitário (R$)<Input type="number" min="0" step="0.01" value={line.valorUnitario} onChange={e=>changeLine(line.key,{valorUnitario:Number(e.target.value)})} className="mt-1"/></label>
    <label className="text-sm">Observação do item<Input value={line.observacao} onChange={e=>changeLine(line.key,{observacao:e.target.value})} className="mt-1" placeholder="Cor, tecido, acabamento..."/></label>
    <Button type="button" variant="ghost" size="icon" disabled={lines.length===1} onClick={()=>{setLines(p=>p.filter(x=>x.key!==line.key));setAnalysis(null);}} aria-label="Remover produto"><Trash2 className="size-4"/></Button>
   </div>)}
   <p className="text-xs text-muted-foreground">O preço inicial vem do cadastro do produto e pode ser ajustado para este pedido. Variações e ficha técnica precisam estar cadastradas para cálculo completo da produção.</p>
  </section>
  <section className="rounded-xl border bg-card p-5 space-y-4">
   <h2 className="font-semibold">3. Entrega e condições comerciais</h2>
   <div className="grid gap-3 md:grid-cols-2">
    <label className="text-sm">Data desejada de entrega<Input type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)} className="mt-1"/></label>
    <label className="text-sm">Condição de pagamento<Input value={condicaoPagamento} onChange={e=>setCondicao(e.target.value)} placeholder="Ex.: 30/60 dias, 50% entrada..." className="mt-1"/></label>
    <label className="text-sm md:col-span-2">Endereço de entrega<Textarea value={enderecoEntrega} onChange={e=>setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade, CEP..." className="mt-1"/></label>
    <label className="text-sm">Frete (R$)<Input type="number" min="0" step="0.01" value={frete} onChange={e=>setFrete(e.target.value)} className="mt-1"/></label>
    <label className="text-sm">Desconto (R$)<Input type="number" min="0" step="0.01" value={desconto} onChange={e=>setDesconto(e.target.value)} className="mt-1"/></label>
    <label className="text-sm md:col-span-2">Observações gerais<Textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Detalhes recebidos do cliente, anexos a incluir posteriormente..." className="mt-1"/></label>
   </div>
   <div className="ml-auto max-w-sm space-y-1 rounded-lg bg-muted p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between"><span>Frete</span><span>{money(Number(frete||0))}</span></div><div className="flex justify-between"><span>Desconto</span><span>- {money(Number(desconto||0))}</span></div><div className="flex justify-between border-t pt-2 text-base"><strong>Total</strong><strong>{money(total)}</strong></div></div>
   <div className="flex justify-end"><Button onClick={submit} disabled={saving||loading}>{saving?"Salvando...":<><Save className="size-4"/> Salvar pedido como orçamento</>}</Button></div>
  </section>
  {analysis&&<section className="rounded-xl border bg-card p-5 space-y-4">
   <div className="flex items-center gap-2"><PackageCheck className="size-5"/><h2 className="font-semibold">Análise preliminar de estoque — {pedidoCode}</h2></div>
   <p className="text-sm text-muted-foreground">Pedido gravado como orçamento. Nenhuma reserva, compra ou ordem de produção foi criada automaticamente nesta etapa.</p>
   {analysis.linhasSemBOM.length>0&&<div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm"><strong>Ficha técnica pendente:</strong> {analysis.linhasSemBOM.join(", ")}. O sistema não consegue calcular componentes desses produtos. Complete as fichas técnicas antes de liberar compras e produção.</div>}
   {analysis.necessidades.length>0?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Componente</th><th className="p-2">Necessário</th><th className="p-2">Disponível</th><th className="p-2">Falta</th></tr></thead><tbody>{analysis.necessidades.map(n=><tr key={n.sku} className="border-b"><td className="p-2">{n.sku} — {n.nome}</td><td className="p-2">{n.necessario.toFixed(3)} {n.unidade}</td><td className="p-2">{n.disponivel.toFixed(3)} {n.unidade}</td><td className="p-2 font-semibold">{n.falta.toFixed(3)} {n.unidade}</td></tr>)}</tbody></table></div>:<p className="text-sm text-muted-foreground">Não há componentes calculáveis para os itens selecionados.</p>}
   <p className="text-xs text-muted-foreground">Análise indicativa de saldo atual menos reservado; ainda não considera reservas concorrentes nem produtos acabados como substitutos de componentes. Não use como autorização de separação ou compra.</p>
  </section>}
 </div>;
}
