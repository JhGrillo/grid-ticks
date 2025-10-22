// Ícone SVG de lupa para botão de detalhes
export default function IconDetalhes({ size = 20, color = '#b6c6f5', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="2" />
      <line x1="14.2" y1="14.2" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
