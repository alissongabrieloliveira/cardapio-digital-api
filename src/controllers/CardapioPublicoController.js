const knex = require("../database");
const { z } = require("zod");

const itemPedidoClienteSchema = z.object({
  produto_id: z.string().uuid("ID do produto inválido"),
  quantidade: z.number().int().positive("A quantidade deve ser maior que zero"),
  observacao: z.string().optional().nullable(),
  adicionais_ids: z
    .array(z.string().uuid("ID de adicional inválido"))
    .optional()
    .default([]),
});

const pedidoClienteSchema = z.object({
  observacoes: z.string().optional().nullable(),
  itens: z
    .array(itemPedidoClienteSchema)
    .min(1, "Selecione pelo menos um item."),
});

class CardapioPublicoController {
  async getCardapio(req, res) {
    try {
      const { tenant_id } = req.mesaAuth;

      const estabelecimento = await knex("estabelecimentos")
        .select(
          "nome",
          "slogan",
          "logo_url",
          "banner_url",
          "horario_funcionamento",
        )
        .where({ id: tenant_id })
        .first();

      const categorias = await knex("categorias")
        .where({ tenant_id, ativo: true })
        .orderBy("ordem", "asc");

      const produtos = await knex("produtos").where({ tenant_id, ativo: true });

      const adicionais = await knex("adicionais").where({ tenant_id });

      const menuEstruturado = categorias.map((categoria) => {
        const produtosDestaCategoria = produtos
          .filter((p) => p.categoria_id === categoria.id)
          .map((produto) => {
            return {
              ...produto,
              adicionais: adicionais.filter((a) => a.produto_id === produto.id),
            };
          });

        return {
          ...categoria,
          produtos: produtosDestaCategoria,
        };
      });

      return res.json({
        estabelecimento,
        mesa: req.mesaAuth.numero,
        menu: menuEstruturado,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao carregar o cardápio." });
    }
  }

  async criarPedidoMesa(req, res) {
    const trx = await knex.transaction();

    try {
      const dadosValidados = pedidoClienteSchema.parse(req.body);
      const { tenant_id, mesa_id } = req.mesaAuth;

      let subtotal = 0;
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

      const [novoPedido] = await trx("pedidos")
        .insert({
          tenant_id,
          mesa_id,
          tipo: "mesa",
          status: "pendente",
          subtotal,
          total: subtotal,
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
        mensagem: "Pedido enviado para a cozinha com sucesso!",
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

module.exports = new CardapioPublicoController();
