const knex = require("../database");
const { z } = require("zod");

const clienteSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  telefone: z.string().min(8, "Telefone inválido").max(20),
});

const enderecoSchema = z.object({
  apelido: z.string().max(100).optional().nullable(),
  rua: z.string().min(2, "A rua é obrigatória").max(150),
  numero: z.string().max(20).optional().nullable(),
  bairro: z.string().max(150).optional().nullable(),
  cidade: z.string().max(150).optional().nullable(),
  referencia: z.string().optional().nullable(),
});

class ClienteController {
  async create(req, res) {
    try {
      const dadosValidados = clienteSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      let cliente = await knex("clientes")
        .where({ telefone: dadosValidados.telefone, tenant_id })
        .first();

      if (cliente) {
        [cliente] = await knex("clientes")
          .where({ id: cliente.id })
          .update({ nome: dadosValidados.nome })
          .returning("*");

        return res
          .status(200)
          .json({ mensagem: "Cliente já cadastrado e atualizado.", cliente });
      }

      [cliente] = await knex("clientes")
        .insert({
          ...dadosValidados,
          tenant_id,
        })
        .returning("*");

      return res
        .status(201)
        .json({ mensagem: "Cliente criado com sucesso.", cliente });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar cliente." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;

      const clientes = await knex("clientes")
        .where({ tenant_id })
        .orderBy("nome", "asc");

      return res.json(clientes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao listar clientes." });
    }
  }

  async addEndereco(req, res) {
    try {
      const { id: cliente_id } = req.params;
      const tenant_id = req.usuario.tenant_id;
      const dadosValidados = enderecoSchema.parse(req.body);

      const cliente = await knex("clientes")
        .where({ id: cliente_id, tenant_id })
        .first();

      if (!cliente) {
        return res.status(404).json({
          erro: "Cliente não encontrado ou não pertence a este estabelecimento.",
        });
      }

      const [novoEndereco] = await knex("enderecos_cliente")
        .insert({
          ...dadosValidados,
          cliente_id,
        })
        .returning("*");

      return res.status(201).json(novoEndereco);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao adicionar endereço." });
    }
  }

  async listEnderecos(req, res) {
    try {
      const { id: cliente_id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const cliente = await knex("clientes")
        .where({ id: cliente_id, tenant_id })
        .first();

      if (!cliente) {
        return res.status(404).json({
          erro: "Cliente não encontrado ou não pertence a este estabelecimento.",
        });
      }

      const enderecos = await knex("enderecos_cliente")
        .where({ cliente_id })
        .orderBy("created_at", "desc");

      return res.json(enderecos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao listar endereços." });
    }
  }
}

module.exports = new ClienteController();
