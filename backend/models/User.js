import mongoose from 'mongoose';


const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  role: { type: String, enum: ['admin', 'atendente', 'gestor'], default: 'atendente' },
  area: { type: [String] }, // áreas vinculadas (array de strings)
  carteira: { type: String }, // carteira vinculada (obrigatório para gestor)
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
