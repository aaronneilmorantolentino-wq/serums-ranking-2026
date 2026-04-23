# 🏥 SERUMS 2026-I — Ranking y Búsqueda Inteligente

Aplicación web que extrae, indexa y permite buscar los **36,679 resultados** de la evaluación para el SERUMS 2026-I.

## ✨ Características

- 🔍 **Búsqueda fuzzy** por nombre con tolerancia a errores ortográficos (Fuse.js)
- 🏆 **Rankings automáticos** — Puesto Nacional y Regional por carrera
- 🥇 **Insignias de mérito** — Top 1%, 5%, 10%, 20% por profesión
- 📊 **Promedio Nacional real** por carrera como punto de comparación (Anchoring)
- 🔥 **Efecto Near Miss** — Muestra cuántos puntos faltaron para el Top 10%
- 📲 **Compartir por WhatsApp** con un solo clic
- 🎨 **Diseño premium** con glassmorphism y modo oscuro
- 📱 **100% responsive** — Optimizado para móvil y escritorio

## 🚀 Instalación

```bash
npm install
npm run dev
```

## 🛠️ Stack Tecnológico

- **React 19** + **Vite**
- **Fuse.js** — Motor de búsqueda fuzzy
- **Lucide React** — Iconografía
- **Vanilla CSS** — Glassmorphism, gradientes, micro-animaciones

## 📄 Origen de los datos

Los datos fueron extraídos del PDF oficial de resultados del SERUMS 2026-I publicado por el Ministerio de Salud del Perú, procesados mediante un script Node.js con `pdf2json`.

## 📜 Licencia

MIT
