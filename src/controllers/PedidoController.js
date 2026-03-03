const knex = require("../database");
const { z } = require("zod");

const itemPedidoSchema = z.object({
  produto_id: z.string().uuid("ID do produto inválido"),
  quantidade: z.number().int().positive("A quantidade deve ser maior que zero"),
  observacao: z.string().optional().nullable(),
  adicionais_ids: z
    .array(z.string().uuid("ID de adicional inválido"))
    .optional()
    .default([]),
});

const pedidoSchema = z.object({
  tipo: z.enum(["mesa", "delivery", "retirada"]),
  mesa_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable(),
  endereco_entrega_id: z.string().uuid().optional().nullable(),
  forma_pagamento: z
    .enum(["dinheiro", "pix", "credito", "debito"])
    .optional()
    .nullable(),
  observacoes: z.string().optional().nullable(),
  itens: z
    .array(itemPedidoSchema)
    .min(1, "O pedido deve ter pelo menos um item"),
});

const statusPedidoSchema = z.object({
  status: z.enum([
    "pendente",
    "preparo",
    "pronto",
    "entrega",
    "finalizado",
    "cancelado",
  ]),
});

class PedidoController {
  async create(req, res) {
    const trx = await knex.transaction();

    try {
      const dadosValidados = pedidoSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      if (dadosValidados.tipo === "mesa" && !dadosValidados.mesa_id) {
        throw new Error("Mesa é obrigatória para pedidos na mesa.");
      }
      if (dadosValidados.tipo === "delivery") {
        if (!dadosValidados.cliente_id || !dadosValidados.endereco_entrega_id) {
          throw new Error("Cliente e Endereço são obrigatórios para delivery.");
        }
      }

      let subtotal = 0;
      let taxa_delivery = 0;
      const itensProcessados = [];

      if (dadosValidados.tipo === "delivery") {
        const estabelecimento = await trx("estabelecimentos")
          .where({ id: tenant_id })
          .first();
        taxa_delivery = Number(estabelecimento.taxa_delivery_fixa) || 0;
      }

      for (const item of dadosValidados.itens) {
        const produto = await trx("produtos")
          .where({ id: item.produto_id, tenant_id, ativo: true })
          .first();
        if (!produto) throw new Error(`Produto não encontrado ou inativo.`);

        let precoItemSubtotal = Number(produto.preco);
        const adicionaisProcessados = [];

        if (item.adicionais_ids && item.adicionais_ids.length > 0) {
          for (const adicional_id of item.adicionais_ids) {
            const adicional = await trx("adicionais")
              .where({ id: adicional_id, produto_id: produto.id, tenant_id })
              .first();

            if (!adicional)
              throw new Error(
                `Adicional inválido para o produto ${produto.nome}.`,
              );

            precoItemSubtotal += Number(adicional.preco);
            adicionaisProcessados.push({
              adicional_id: adicional.id,
              nome_adicional: adicional.nome,
              preco: adicional.preco,
            });
          }
        }

        const custoTotalItem = precoItemSubtotal * item.quantidade;
        subtotal += custoTotalItem;

        itensProcessados.push({
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco,
          quantidade: item.quantidade,
          observacao: item.observacao,
          adicionais: adicionaisProcessados,
        });
      }

      const total = subtotal + taxa_delivery;

      const [novoPedido] = await trx("pedidos")
        .insert({
          tenant_id,
          mesa_id: dadosValidados.mesa_id,
          cliente_id: dadosValidados.cliente_id,
          endereco_entrega_id: dadosValidados.endereco_entrega_id,
          tipo: dadosValidados.tipo,
          status: "pendente",
          forma_pagamento: dadosValidados.forma_pagamento,
          taxa_delivery,
          subtotal,
          total,
          observacoes: dadosValidados.observacoes,
        })
        .returning("*");

      for (const itemProcessado of itensProcessados) {
        const { adicionais, ...dadosItem } = itemProcessado;

        const [pedidoItemInserido] = await trx("pedido_itens")
          .insert({
            pedido_id: novoPedido.id,
            ...dadosItem,
          })
          .returning("id");

        if (adicionais.length > 0) {
          const adicionaisParaInserir = adicionais.map((adc) => ({
            pedido_item_id: pedidoItemInserido.id,
            adicional_id: adc.adicional_id,
            nome_adicional: adc.nome_adicional,
            preco: adc.preco,
          }));

          await trx("pedido_itens_adicionais").insert(adicionaisParaInserir);
        }
      }

      await trx.commit();

      return res
        .status(201)
        .json({ mensagem: "Pedido criado com sucesso.", pedido: novoPedido });
    } catch (error) {
      await trx.rollback();

      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }

      if (error.message) {
        return res.status(400).json({ erro: error.message });
      }

      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao processar o pedido." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;

      const { status } = req.query;

      let query = knex("pedidos")
        .where({ tenant_id })
        .orderBy("created_at", "desc");

      if (status) {
        query = query.where({ status });
      }

      const pedidos = await query;
      return res.json(pedidos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao listar pedidos." });
    }
  }

  async updateStatus(req, res) {
    const trx = await knex.transaction();

    try {
      const { id } = req.params;
      const { status: novoStatus } = statusPedidoSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      const pedido = await trx("pedidos").where({ id, tenant_id }).first();

      if (!pedido) {
        throw new Error(
          "Pedido não encontrado ou não pertence a este estabelecimento.",
        );
      }

      if (pedido.status === "finalizado" || pedido.status === "cancelado") {
        throw new Error(
          `Não é possível alterar o status de um pedido que já está ${pedido.status}.`,
        );
      }

      const [pedidoAtualizado] = await trx("pedidos")
        .where({ id, tenant_id })
        .update({
          status: novoStatus,
          updated_at: knex.fn.now(),
        })
        .returning("*");

      if (novoStatus === "finalizado") {
        await trx("movimentacoes_financeiras").insert({
          tenant_id,
          pedido_id: pedido.id,
          tipo: "entrada",
          descricao: `Receita referente ao Pedido concluído. Cliente/Mesa associada.`,
          valor: pedido.total,
        });
      }

      await trx.commit();

      return res.json({
        mensagem: `Status atualizado para ${novoStatus} com sucesso.`,
        pedido: pedidoAtualizado,
      });
    } catch (error) {
      await trx.rollback();

      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Status inválido", detalhes: error.errors });
      }

      if (error.message) {
        return res.status(400).json({ erro: error.message });
      }

      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao atualizar o status do pedido." });
    }
  }
}

module.exports = new PedidoController();
