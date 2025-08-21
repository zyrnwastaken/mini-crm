import { useState, useEffect } from 'react';

/**
 * This is the main application page. It provides a simple login screen and, upon
 * successful authentication, a lightweight CRM dashboard where you can manage
 * customers, items and orders. Each section is reachable via a tab-like
 * navigation. Data is persisted via API routes backed by MongoDB and secured
 * with JWTs. All requests attach the bearer token returned on login.
 */
export default function Home() {
  // Authentication state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [authError, setAuthError] = useState('');

  // UI state
  const [page, setPage] = useState('customers');
  const [isLoading, setIsLoading] = useState(false);

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);

  // Forms
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [itemForm, setItemForm] = useState({ name: '', price: '', cost: '', photo: '', itemId: '' });
  const [orderForm, setOrderForm] = useState({ customerId: '', orderId: '', status: 'Pending' });
  const [orderItems, setOrderItems] = useState([]);

  // Helpers to fetch data after login or when switching pages
  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setIsLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      try {
        if (page === 'customers') {
          const res = await fetch('/api/customers', { headers });
          const data = await res.json();
          setCustomers(data);
        } else if (page === 'items') {
          const res = await fetch('/api/items', { headers });
          const data = await res.json();
          setItems(data);
        } else if (page === 'orders') {
          const res = await fetch('/api/orders', { headers });
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token, page]);

  // Authentication handler
  const handleLogin = async () => {
    setAuthError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const error = await res.json();
        setAuthError(error.error || 'Invalid credentials');
        return;
      }
      const data = await res.json();
      setToken(data.token);
      // Reset form fields
      setUsername('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setAuthError('Network error');
    }
  };

  // Customer CRUD
  const createCustomer = async () => {
    if (!customerForm.name || !customerForm.email) return;
    const body = { ...customerForm };
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setCustomers([data, ...customers]);
    setCustomerForm({ name: '', email: '', phone: '', address: '' });
  };

  // Item CRUD
  const createItem = async () => {
    // Auto generate an itemId if left blank
    const itemId = itemForm.itemId && itemForm.itemId.trim() !== '' ? itemForm.itemId : `ITEM_${Date.now()}`;
    const body = { ...itemForm, itemId };
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setItems([data, ...items]);
    setItemForm({ name: '', price: '', cost: '', photo: '', itemId: '' });
  };

  // Order helpers
  const toggleItemInOrder = (item) => {
    const existing = orderItems.find((i) => i.itemMongoId === item._id);
    if (existing) {
      setOrderItems(orderItems.filter((i) => i.itemMongoId !== item._id));
    } else {
      setOrderItems([...orderItems, { itemMongoId: item._id, quantity: 1, price: item.price }]);
    }
  };
  const updateItemQty = (id, qty) => {
    setOrderItems(
      orderItems.map((i) =>
        i.itemMongoId === id ? { ...i, quantity: parseInt(qty) || 1 } : i
      )
    );
  };
  const createOrder = async () => {
    if (!orderForm.customerId || orderItems.length === 0) return;
    const orderId = orderForm.orderId && orderForm.orderId.trim() !== '' ? orderForm.orderId : `ORD_${Date.now()}`;
    const body = {
      customerId: orderForm.customerId,
      orderId,
      status: orderForm.status,
      items: orderItems,
    };
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setOrders([data, ...orders]);
    // Reset form
    setOrderForm({ customerId: '', orderId: '', status: 'Pending' });
    setOrderItems([]);
  };
  const updateOrderStatus = async (orderId, newStatus) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setOrders(
      orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  // Simple card UI for each entity
  const Card = ({ children }) => (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      {children}
    </div>
  );

  // Render
  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2 style={{ marginBottom: 12 }}>Admin Login</h2>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          {authError && <p style={{ color: 'red', marginBottom: 8 }}>{authError}</p>}
          <button onClick={handleLogin} style={{ padding: '8px 16px' }}>
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setPage('customers')} style={{ padding: '6px 12px', background: page === 'customers' ? '#eee' : '#fff' }}>
          Customers
        </button>
        <button onClick={() => setPage('items')} style={{ padding: '6px 12px', background: page === 'items' ? '#eee' : '#fff' }}>
          Items
        </button>
        <button onClick={() => setPage('orders')} style={{ padding: '6px 12px', background: page === 'orders' ? '#eee' : '#fff' }}>
          Orders
        </button>
      </nav>
      {isLoading && <p>Loading…</p>}
      {page === 'customers' && (
        <div>
          <h2 style={{ marginBottom: 8 }}>Customers</h2>
          <div style={{ marginBottom: 16, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <h3>Add Customer</h3>
            <input
              type="text"
              placeholder="Name"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="email"
              placeholder="Email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="text"
              placeholder="Phone"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="text"
              placeholder="Address"
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <button onClick={createCustomer} style={{ padding: '6px 12px' }}>
              Save Customer
            </button>
          </div>
          {customers.map((c) => (
            <Card key={c._id}>
              <strong>{c.name}</strong>
              <div>Email: {c.email}</div>
              <div>Phone: {c.phone}</div>
              <div>Address: {c.address}</div>
            </Card>
          ))}
        </div>
      )}
      {page === 'items' && (
        <div>
          <h2 style={{ marginBottom: 8 }}>Items</h2>
          <div style={{ marginBottom: 16, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <h3>Add Item</h3>
            <input
              type="text"
              placeholder="Name"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="text"
              placeholder="Item ID (auto if blank)"
              value={itemForm.itemId}
              onChange={(e) => setItemForm({ ...itemForm, itemId: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="number"
              placeholder="Price"
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="number"
              placeholder="Cost"
              value={itemForm.cost}
              onChange={(e) => setItemForm({ ...itemForm, cost: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <input
              type="text"
              placeholder="Photo URL"
              value={itemForm.photo}
              onChange={(e) => setItemForm({ ...itemForm, photo: e.target.value })}
              style={{ width: '100%', padding: 6, marginBottom: 6 }}
            />
            <button onClick={createItem} style={{ padding: '6px 12px' }}>
              Save Item
            </button>
          </div>
          {items.map((it) => (
            <Card key={it._id}>
              <strong>{it.name}</strong> (ID: {it.itemId})
              <div>Price: {it.price}</div>
              <div>Cost: {it.cost}</div>
              {it.photo && (
                <img src={it.photo} alt={it.name} style={{ maxWidth: '100%', height: 100, objectFit: 'cover', marginTop: 6 }} />
              )}
            </Card>
          ))}
        </div>
      )}
      {page === 'orders' && (
        <div>
          <h2 style={{ marginBottom: 8 }}>Orders</h2>
          <div style={{ marginBottom: 16, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <h3>Create Order</h3>
            <div style={{ marginBottom: 6 }}>
              <select
                value={orderForm.customerId}
                onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}
                style={{ width: '100%', padding: 6, marginBottom: 6 }}
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Order ID (auto if blank)"
                value={orderForm.orderId}
                onChange={(e) => setOrderForm({ ...orderForm, orderId: e.target.value })}
                style={{ width: '100%', padding: 6, marginBottom: 6 }}
              />
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                style={{ width: '100%', padding: 6, marginBottom: 6 }}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div style={{ marginBottom: 6 }}>
              <h4>Add Items</h4>
              {items.map((it) => (
                <div key={it._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!orderItems.find((i) => i.itemMongoId === it._id)}
                    onChange={() => toggleItemInOrder(it)}
                  />
                  <span style={{ marginLeft: 6 }}>{it.name}</span>
                  {orderItems.find((i) => i.itemMongoId === it._id) && (
                    <input
                      type="number"
                      min={1}
                      value={orderItems.find((i) => i.itemMongoId === it._id)?.quantity || 1}
                      onChange={(e) => updateItemQty(it._id, e.target.value)}
                      style={{ width: 60, marginLeft: 6, padding: 2 }}
                    />
                  )}
                </div>
              ))}
            </div>
            <button onClick={createOrder} style={{ padding: '6px 12px' }}>
              Save Order
            </button>
          </div>
          {orders.map((o) => {
            // compute total and item count
            const totalQty = o.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
            const totalPrice = o.items?.reduce((sum, i) => sum + (i.quantity || 1) * parseFloat(i.price || 0), 0).toFixed(2);
            return (
              <Card key={o._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{o.orderId}</strong>
                    <div>Customer: {customers.find((c) => c._id === o.customerId)?.name || o.customerId}</div>
                    <div>Items: {totalQty}</div>
                    <div>Total: {totalPrice}</div>
                  </div>
                  <div>
                    <select
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                      style={{ padding: 4 }}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                </div>
                {/* Show breakdown of items */}
                {o.items?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>
                    <em>Items:</em>
                    {o.items.map((it) => (
                      <div key={it.itemMongoId} style={{ marginLeft: 12 }}>
                        {items.find((i) => i._id === it.itemMongoId)?.name || it.itemMongoId} x {it.quantity} @ {it.price}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
