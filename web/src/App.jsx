import { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:4000/api';
const categories = ['Wallet', 'Phone', 'Keys', 'Bag', 'Pet', 'Documents', 'Jewelry', 'Laptop', 'Watch', 'Other'];

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'lost',
    category: 'Wallet',
    locationName: 'Downtown Center',
    latitude: '12.9716',
    longitude: '77.5946',
    image: null,
  });

  const stats = useMemo(() => {
    const open = items.filter((item) => item.status === 'open').length;
    const lost = items.filter((item) => item.type === 'lost').length;
    const found = items.filter((item) => item.type === 'found').length;
    return { open, lost, found };
  }, [items]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/items`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load items', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        payload.append(key, value);
      }
    });

    try {
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');

      setForm({
        title: '',
        description: '',
        type: 'lost',
        category: 'Wallet',
        locationName: 'Downtown Center',
        latitude: '12.9716',
        longitude: '77.5946',
        image: null,
      });

      await fetchItems();
      alert(`Match alert: ${data.matches?.length || 0} potential matches found.`);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-orbit" />
          <div>
            <p className="eyebrow">Lost & Found Platform</p>
            <h1>Orbit</h1>
          </div>
        </div>

        <nav className="nav">
          <span>Dashboard</span>
          <span>Matches</span>
          <span>Map</span>
          <button className="primary-btn">Report Item</button>
        </nav>
      </header>

      <main className="content-grid">
        <section className="hero-panel panel">
          <div className="hero-copy">
            <p className="eyebrow alt">Reconnect what was lost.</p>
            <h2>Orbit your valuables back home.</h2>
            <p className="subtext">
              Scan a lost item, report a found object, and let Orbit detect high-probability matches through image similarity and precise location checks.
            </p>

            <div className="cta-row">
              <button className="primary-btn large">Post Lost Item</button>
              <button className="secondary-btn large">Post Found Item</button>
            </div>

            <div className="stats-row">
              <div className="mini-stat">
                <strong>{stats.open}</strong>
                <span>Open cases</span>
              </div>
              <div className="mini-stat">
                <strong>{stats.lost}</strong>
                <span>Lost</span>
              </div>
              <div className="mini-stat">
                <strong>{stats.found}</strong>
                <span>Found</span>
              </div>
            </div>
          </div>

          <div className="orbital-visual" aria-label="Orbit visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="pulse-core">
              <span className="pulse-dot" />
              <span className="pulse-ring" />
            </div>
            <div className="floating-card card-1">Lost Wallet</div>
            <div className="floating-card card-2">Found Keys</div>
            <div className="floating-card card-3">92% Match</div>
          </div>
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow alt">Quick report</p>
              <h3>New item</h3>
            </div>
            <span className="badge badge-live">Live</span>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            <div className="field-group inline-two">
              <label>
                Title
                <input name="title" value={form.title} onChange={handleChange} placeholder="Blue backpack" required />
              </label>
              <label>
                Type
                <select name="type" value={form.type} onChange={handleChange}>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
              </label>
            </div>

            <div className="field-group inline-two">
              <label>
                Category
                <select name="category" value={form.category} onChange={handleChange}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <input name="locationName" value={form.locationName} onChange={handleChange} placeholder="Near MG Road" />
              </label>
            </div>

            <div className="field-group inline-two">
              <label>
                Latitude
                <input name="latitude" value={form.latitude} onChange={handleChange} type="number" step="0.0001" />
              </label>
              <label>
                Longitude
                <input name="longitude" value={form.longitude} onChange={handleChange} type="number" step="0.0001" />
              </label>
            </div>

            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} rows="4" placeholder="Describe visible features, color, brand, and unique markers." />
            </label>

            <label className="upload-box">
              <span>Upload image</span>
              <input type="file" name="image" accept="image/*" onChange={handleChange} />
            </label>

            <button className="primary-btn large" type="submit">Submit report</button>
          </form>
        </section>

        <section className="panel matches-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow alt">Similarity engine</p>
              <h3>Match results</h3>
            </div>
            <span className="badge">AI tuned</span>
          </div>

          <div className="match-list">
            {loading ? (
              <p>Loading Orbit database...</p>
            ) : items.length === 0 ? (
              <p>No reports yet. Be the first to publish a lost or found item.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="match-card">
                  <div className="match-image">
                    {item.image_url ? (
                      <img src={`http://localhost:4000${item.image_url}`} alt={item.title} />
                    ) : (
                      <div className="fallback-image">{item.type === 'lost' ? 'Lost' : 'Found'}</div>
                    )}
                  </div>

                  <div className="match-copy">
                    <div className="match-topline">
                      <span className={`tag ${item.type}`}>{item.type}</span>
                      <span className="category-pill">{item.category}</span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.description || 'No extra description provided.'}</p>
                    <div className="meta-row">
                      <span>{item.location_name || 'Location not provided'}</span>
                      <span>{item.status}</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
