import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search, Users, MapPin, Stethoscope, Target, Globe, ChevronDown, AlertTriangle, ExternalLink } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

const ResultCard = React.memo(({ row }) => {
  return (
    <div className="result-card">
      <div className="card-header">
        <div>
          <h3 className="card-name">{row.nombre}</h3>
          <p className="card-prof"><Stethoscope size={14} /> {row.profesion}</p>
          {row.badge && (
            <div className="top-badge">
              {row.badge} Nacional
            </div>
          )}
        </div>
        <div className="score-display">
          <span className="score-value">{row.nota}</span>
        </div>
      </div>

      <div className="card-divider"></div>

      <div className="rankings">
        <div className="rank-item rank-item-highlight">
          <span className="rank-label">Promedio Nacional ({row.profesion}):</span>
          <span className="rank-value rank-value-highlight">{row.promedioNacional}</span>
        </div>
        <div className="rank-item">
          <span className="rank-label"><Globe size={16} /> Puesto Nacional</span>
          <span className="rank-value">#{row.rankNacional} <span>/ {row.totalNacional}</span></span>
        </div>
        <div className="rank-item">
          <span className="rank-label"><Target size={16} /> Puesto en {row.region}</span>
          <span className="rank-value">#{row.rankRegional} <span>/ {row.totalRegional}</span></span>
        </div>
        <div className="rank-item">
          <span className="rank-label"><Users size={16} /> Superaste a</span>
          <span className="rank-value">{row.superados.toLocaleString()} <span>postulantes</span></span>
        </div>
      </div>

      {row.nearMiss && (
        <div className="near-miss-alert">
          {row.nearMiss}
        </div>
      )}

      <button
        className="share-btn"
        onClick={() => {
          const text = `¡Acabo de revisar mi puntaje SERUMS 2026-I!\nSoy el Puesto ${row.rankNacional} de ${row.totalNacional} a Nivel Nacional en ${row.profesion} con ${row.nota} puntos.\n¡Revisa tu ranking también!`;
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
        }}
      >
        📲 Compartir mi Ranking
      </button>
    </div>
  );
});

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterProfesion, setFilterProfesion] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [sortBy, setSortBy] = useState('rankNacional'); // rankNacional | rankRegional | nota
  const [visibleCount, setVisibleCount] = useState(30);
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return localStorage.getItem('serums_disclaimer_accepted') !== 'true';
  });

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('serums_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  // Extract unique professions and regions for dropdown filters
  const profesiones = useMemo(() => [...new Set(data.map(d => d.profesion))].sort(), [data]);
  const regiones = useMemo(() => [...new Set(data.map(d => d.region))].sort(), [data]);

  // Process data to add rankings and badges
  const processData = (rawData) => {
    const profMap = {};
    const regMap = {};

    rawData.forEach(row => {
      row.numericNota = parseFloat(row.nota);
      if (isNaN(row.numericNota)) row.numericNota = 0;

      if (!profMap[row.profesion]) profMap[row.profesion] = [];
      profMap[row.profesion].push(row);

      const regKey = `${row.profesion}_${row.region}`;
      if (!regMap[regKey]) regMap[regKey] = [];
      regMap[regKey].push(row);
    });

    // National ranking per profession
    Object.keys(profMap).forEach(prof => {
      const arr = profMap[prof];
      arr.sort((a, b) => b.numericNota - a.numericNota);

      const totalScore = arr.reduce((acc, row) => acc + row.numericNota, 0);
      const avgScore = (totalScore / arr.length).toFixed(2);

      const top10Index = Math.floor(arr.length * 0.10);
      const top10Score = arr.length > 0 && top10Index < arr.length ? arr[top10Index].numericNota : 0;

      arr.forEach((row, idx) => {
        row.rankNacional = idx + 1;
        row.totalNacional = arr.length;
        row.promedioNacional = avgScore;
        row.superados = arr.length - (idx + 1);
        const percentil = row.rankNacional / row.totalNacional;

        if (percentil <= 0.01) row.badge = "🏆 Top 1%";
        else if (percentil <= 0.05) row.badge = "🥇 Top 5%";
        else if (percentil <= 0.10) row.badge = "🥈 Top 10%";
        else if (percentil <= 0.20) row.badge = "🥉 Top 20%";
        else row.badge = null;

        // Near Miss effect (real data only)
        row.nearMiss = null;
        if (percentil > 0.10 && percentil <= 0.25) {
          const gap = (top10Score - row.numericNota).toFixed(2);
          if (parseFloat(gap) > 0 && parseFloat(gap) <= 1.5) {
            row.nearMiss = `🔥 ¡Por poco! Estuviste a solo ${gap} puntos de entrar al Top 10% Nacional.`;
          }
        }
      });
    });

    // Regional ranking per profession+region
    Object.keys(regMap).forEach(key => {
      const arr = regMap[key];
      arr.sort((a, b) => b.numericNota - a.numericNota);
      arr.forEach((row, idx) => {
        row.rankRegional = idx + 1;
        row.totalRegional = arr.length;
      });
    });

    // Sort entire dataset by nota descending as default global order
    rawData.sort((a, b) => b.numericNota - a.numericNota);
    return rawData;
  };

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(json => {
        const enrichedData = processData(json);
        setData(enrichedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fuse index for text search (only used when query is not empty)
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: ['nombre'],
      threshold: 0.3,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
  }, [data]);

  // Main filtering + sorting pipeline
  const results = useMemo(() => {
    let pool;

    // Step 1: Text search or full dataset
    if (debouncedQuery.trim()) {
      pool = fuse.search(debouncedQuery).map(r => r.item);
    } else {
      pool = [...data];
    }

    // Step 2: Apply dropdown filters
    if (filterProfesion) {
      pool = pool.filter(r => r.profesion === filterProfesion);
    }
    if (filterRegion) {
      pool = pool.filter(r => r.region === filterRegion);
    }

    // Step 3: Sort results
    pool.sort((a, b) => {
      if (sortBy === 'rankNacional') return a.rankNacional - b.rankNacional;
      if (sortBy === 'rankRegional') return a.rankRegional - b.rankRegional;
      if (sortBy === 'nota') return b.numericNota - a.numericNota;
      return 0;
    });

    return pool;
  }, [debouncedQuery, fuse, data, filterProfesion, filterRegion, sortBy]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [debouncedQuery, filterProfesion, filterRegion, sortBy]);

  const visibleResults = results.slice(0, visibleCount);

  return (
    <div className="app-container">
      <h1>SERUMS 2026-I</h1>
      <p className="subtitle">Ranking y Resultados - Búsqueda Inteligente</p>

      <div className="search-panel">
        {/* Text search */}
        <div className="search-input-wrapper">
          <Search className="search-icon" size={24} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por apellidos y nombres..."
            aria-label="Buscar postulante"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Dropdown filters */}
        <div className="filters">
          <div className="select-wrapper">
            <Stethoscope size={16} className="select-icon" />
            <select
              className="filter-select"
              aria-label="Filtrar por profesión"
              value={filterProfesion}
              onChange={(e) => setFilterProfesion(e.target.value)}
            >
              <option value="">Todas las Profesiones</option>
              {profesiones.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>

          <div className="select-wrapper">
            <MapPin size={16} className="select-icon" />
            <select
              className="filter-select"
              aria-label="Filtrar por región"
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="">Todas las Regiones</option>
              {regiones.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>

          <div className="select-wrapper">
            <Target size={16} className="select-icon" />
            <select
              className="filter-select"
              aria-label="Criterio de ordenamiento"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rankNacional">Ordenar: Ranking Nacional</option>
              <option value="rankRegional">Ordenar: Ranking Regional</option>
              <option value="nota">Ordenar: Mayor Nota</option>
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>
      </div>

      <div className="results-info">
        <span>{results.length.toLocaleString()} resultados encontrados</span>
        <span>Mostrando {Math.min(visibleCount, results.length)} de {results.length.toLocaleString()}</span>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Calculando rankings (36,000+ registros)...</p>
        </div>
      ) : (
        <>
          <div className="results-grid">
            {visibleResults.length > 0 ? (
              visibleResults.map((row, index) => (
                <ResultCard key={index} row={row} />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', width: '100%', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
                No se encontraron resultados para "{query}"
              </div>
            )}
          </div>

          {visibleCount < results.length && (
            <button
              className="load-more-btn"
              onClick={() => setVisibleCount(prev => prev + 30)}
            >
              Cargar más resultados ({results.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}

      {/* Footer Permanente */}
      <footer className="app-footer">
        <p>
          Herramienta independiente de búsqueda. <br />
          Fuente oficial de datos: <a href="https://www.gob.pe/institucion/minsa/informes-publicaciones/8050557-resultados-de-la-evaluacion-para-el-serums-2026-i" target="_blank" rel="noopener noreferrer">Ministerio de Salud (MINSA) - Resultados SERUMS 2026-I</a>
        </p>
      </footer>

      {showDisclaimer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">
              <AlertTriangle className="modal-title-icon" size={28} />
              Aviso Legal Importante
            </div>
            
            <p className="modal-text">
              Esta plataforma web es una herramienta de código abierto desarrollada <strong>exclusivamente con fines de testeo, prueba y visualización de datos</strong>. No tiene ninguna afiliación, patrocinio ni vínculo oficial con el Ministerio de Salud (MINSA).
            </p>
            
            <p className="modal-text">
              Los datos mostrados han sido extraídos de forma automatizada y podrían contener márgenes de error. Esta herramienta <strong>no tiene validez legal</strong> para reclamos, adjudicación de plazas, ni procesos administrativos.
            </p>

            <div className="modal-link-box">
              <p className="modal-text" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Para información oficial y trámites, consulte obligatoriamente el documento del MINSA:
              </p>
              <a 
                href="https://www.gob.pe/institucion/minsa/informes-publicaciones/8050557-resultados-de-la-evaluacion-para-el-serums-2026-i" 
                target="_blank" 
                rel="noopener noreferrer"
                className="modal-link"
              >
                Ver Resultados Oficiales en Gob.pe <ExternalLink size={16} />
              </a>
            </div>

            <button className="modal-btn" onClick={handleAcceptDisclaimer}>
              Entiendo y Acepto las Condiciones
            </button>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
}

export default App;
