const knex = require("../database");
const { z } = require("zod");

const clienteDeliverySchema = z.object({
  nome: z.string().min(2, "O nome é obrigatório"),
  telefone: z.string().min(8, "Telefone inválido").max(20),
});

const enderecoDeliverySchema = z.object({
  rua: z.string().min(2, "A rua é obrigatória"),
  numero: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
});

const itemPedidoDeliverySchema = z.object({
  produto_id: z.string().uuid("ID do produto inválido"),
  quantidade: z.number().int().positive("A quantidade deve ser maior que zero"),
  observacao: z.string().optional().nullable(),
  adicionais_ids: z
    .array(z.string().uuid("ID de adicional inválido"))
    .optional()
    .default([]),
});

const pedidoDeliverySchema = z.object({
  tipo: z.enum(["delivery", "retirada"]),
  forma_pagamento: z.enum(["dinheiro", "pix", "credito", "debito"]),
  cliente: clienteDeliverySchema,
  endereco: enderecoDeliverySchema.optional().nullable(),
  observacoes: z.string().optional().nullable(),
  itens: z
    .array(itemPedidoDeliverySchema)
    .min(1, "Selecione pelo menos um item."),
});

class CardapioDeliveryController {
  async getCardapio(req, res) {
    try {
      const { slug } = req.params;

      const estabelecimento = await knex("estabelecimentos")
        .select(
          "id",
          "nome",
          "slogan",
          "logo_url",
          "banner_url",
          "horario_funcionamento",
          "taxa_delivery_fixa",
          "ativo",
        )
        .where({ slug })
        .first();

      if (!estabelecimento || !estabelecimento.ativo) {
        return res
          .status(404)
          .json({ erro: "Estabelecimento não encontrado ou inativo." });
      }

      const tenant_id = estabelecimento.id;

      const categorias = await knex("categorias")
        .where({ tenant_id, ativo: true })
        .orderBy("ordem", "asc");
      const produtos = await knex("produtos").where({ tenant_id, ativo: true });
      const adicionais = await knex("adicionais").where({ tenant_id });

      const menuEstruturado = categorias.map((categoria) => ({
        ...categoria,
        produtos: produtos
          .filter((p) => p.categoria_id === categoria.id)
          .map((produto) => ({
            ...produto,
            adicionais: adicionais.filter((a) => a.produto_id === produto.id),
          })),
      }));

      return res.json({
        estabelecimento: {
          nome: estabelecimento.nome,
          slogan: estabelecimento.slogan,
          logo_url: estabelecimento.logo_url,
          banner_url: estabelecimento.banner_url,
          horario_funcionamento: estabelecimento.horario_funcionamento,
          taxa_delivery_fixa: estabelecimento.taxa_delivery_fixa,
        },
        menu: menuEstruturado,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao carregar o cardápio." });
    }
  }

  async criarPedidoDelivery(req, res) {
    const trx = await knex.transaction();

    try {
      const { slug } = req.params;
      const dadosValidados = pedidoDeliverySchema.parse(req.body);

      const estabelecimento = await trx("estabelecimentos")
        .where({ slug, ativo: true })
        .first();
      if (!estabelecimento) {
        throw new Error("Estabelecimento não encontrado ou inativo.");
      }
      const tenant_id = estabelecimento.id;

      if (dadosValidados.tipo === "delivery" && !dadosValidados.endereco) {
        throw new Error(
          "Endereço de entrega é obrigatório para pedidos de delivery.",
        );
      }

      let cliente = await trx("clientes")
        .where({ telefone: dadosValidados.cliente.telefone, tenant_id })
        .first();

      if (!cliente) {
        [cliente] = await trx("clientes")
          .insert({
            tenant_id,
            nome: dadosValidados.cliente.nome,
            telefone: dadosValidados.cliente.telefone,
          })
          .returning("*");
      } else if (cliente.nome !== dadosValidados.cliente.nome) {
        [cliente] = await trx("clientes")
          .where({ id: cliente.id })
          .update({ nome: dadosValidados.cliente.nome })
          .returning("*");
      }

      let endereco_entrega_id = null;
      if (dadosValidados.tipo === "delivery") {
        const [novoEndereco] = await trx("enderecos_cliente")
          .insert({
            cliente_id: cliente.id,
            rua: dadosValidados.endereco.rua,
            numero: dadosValidados.endereco.numero,
            bairro: dadosValidados.endereco.bairro,
            cidade: dadosValidados.endereco.cidade,
            referencia: dadosValidados.endereco.referencia,
          })
          .returning("id");

        endereco_entrega_id = novoEndereco.id;
      }

      let subtotal = 0;
      let taxa_delivery =
        dadosValidados.tipo === "delivery"
          ? Number(estabelecimento.taxa_delivery_fixa)
          : 0;
      const itensProcessados = [];

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

        subtotal += precoItemSubtotal * item.quantidade;

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
          cliente_id: cliente.id,
          endereco_entrega_id,
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

      return res.status(201).json({
        mensagem: "Pedido recebido com sucesso!",
        pedido: novoPedido,
      });
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
}

module.exports = new CardapioDeliveryController();
