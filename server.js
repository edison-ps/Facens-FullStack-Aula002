import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, { dbName: "controleFinanceiro" })
  .then(() => console.log("Conectado ao MongoDB"))
  .catch((err) => console.error("Erro na conexão:", err.message));

const movimentacaoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      required: true,
      enum: ["entrada", "saida"],
      lowercase: true,
      trim: true,
    },
    categoria: { type: String, required: true, trim: true, minlength: 2 },
    valor: { type: Number, required: true, min: 0.01 },
    data: { type: Date, required: true },
    descricao: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { collection: "financeiro", timestamps: true },
);

const Movimentacao = mongoose.model(
  "Movimentacao",
  movimentacaoSchema,
  "financeiro",
);

app.get("/", (req, res) => res.json({ msg: "API RODOOO ;D" }));

app.post("/movimentacoes", async (req, res) => {
  try {
    const mov = await Movimentacao.create(req.body);
    res.status(201).json(mov);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/movimentacoes", async (req, res) => {
  try {
    const { tipo, categoria, dataInicio, dataFim } = req.query;

    const filtro = {};

    if (tipo) filtro.tipo = String(tipo).toLowerCase();
    if (categoria) if (categoria) filtro.categoria = categoria;

    if (dataInicio || dataFim) {
      filtro.data = {};
      if (dataInicio) filtro.data.$gte = new Date(String(dataInicio));
      if (dataFim) {
        const fim = new Date(String(dataFim));
        fim.setHours(23, 59, 59, 999);
        filtro.data.$lte = fim;
      }
    }

    const lista = await Movimentacao.find(filtro).sort({
      data: -1,
      createdAt: -1,
    });
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/movimentacoes/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID n tá valido" });
    }

    const mov = await Movimentacao.findById(req.params.id);
    if (!mov)
      return res.status(404).json({ error: "Movimentação n foi encontrada" });

    res.json(mov);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/movimentacoes/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID n tá valido" });
    }

    const mov = await Movimentacao.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      overwrite: true,
    });

    if (!mov)
      return res.status(404).json({ error: "Movimentação n foi encontrada" });
    res.json(mov);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/movimentacoes/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID n tá valido" });
    }

    const mov = await Movimentacao.findByIdAndDelete(req.params.id);
    if (!mov)
      return res.status(404).json({ error: "Movimentação n foi encontrada" });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/saldo", async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const match = {};
    if (dataInicio || dataFim) {
      match.data = {};
      if (dataInicio) match.data.$gte = new Date(String(dataInicio));
      if (dataFim) {
        const fim = new Date(String(dataFim));
        fim.setHours(23, 59, 59, 999);
        match.data.$lte = fim;
      }
    }

    const resultado = await Movimentacao.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$tipo",
          total: { $sum: "$valor" },
        },
      },
    ]);

    const totalEntradas =
      resultado.find((x) => x._id === "entrada")?.total ?? 0;
    const totalSaidas = resultado.find((x) => x._id === "saida")?.total ?? 0;

    res.json({
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Porta do server -> http://localhost:${process.env.PORT}`),
);
