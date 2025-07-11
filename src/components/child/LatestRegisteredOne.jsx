"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { apiClient } from "@/api/api";
const LatestRegisteredOne = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numOrders, setNumOrders] = useState(5);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/api/latest_orders?n=${numOrders}`);
        setOrders(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [numOrders]);

  return (
    <div className='col-xxl-9 col-xl-12'>
      <div className='card h-100'>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16'>
            <ul
              className='nav border-gradient-tab nav-pills mb-0'
              id='pills-tab'
              role='tablist'
            >
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center active'
                  id='pills-to-do-list-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-to-do-list'
                  type='button'
                  role='tab'
                  aria-controls='pills-to-do-list'
                  aria-selected='true'
                >
                  Latest Orders
                  <span className='text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert'>
                    {orders.length}
                  </span>
                </button>
              </li>
            </ul>
            <div>
              <label htmlFor="numOrders" className="me-2 fw-medium">Show latest:</label>
              <select
                id="numOrders"
                value={numOrders}
                onChange={e => setNumOrders(Number(e.target.value))}
                className="form-select d-inline-block w-auto"
                style={{ minWidth: 80 }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className='tab-content' id='pills-tabContent'>
            <div
              className='tab-pane fade show active'
              id='pills-to-do-list'
              role='tabpanel'
              aria-labelledby='pills-to-do-list-tab'
              tabIndex={0}
            >
              <div className='table-responsive scroll-sm'>
                <table className='table bordered-table sm-table mb-0'>
                  <thead>
                    <tr>
                      <th scope='col'>Order Id </th>
                      <th scope='col'>Ordered On</th>
                      <th scope='col'>Product</th>
                      <th scope='col' className='text-center'>
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center">Loading...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="4" className="text-center text-danger">{error}</td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center">No orders found.</td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        // Calculate total quantity of products purchased
                        const totalQty = order.lineItems?.edges?.reduce((sum, edge) => sum + (edge.node.quantity || 0), 0) || 0;
                        return (
                          <tr key={order.id}>
                            <td>
                              <div className='d-flex align-items-center'>
                                {/* No user image in API, use a placeholder */}
                                <img
                                  src='assets\images\make\dashborad-05.jpg'
                                  alt='User'
                                  className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                                />
                                <div className='flex-grow-1'>
                                  <h6 className='text-md mb-0 fw-medium'>{order.name}</h6>
                                  <span className='text-sm text-secondary-light fw-medium'>
                                    {order.shippingAddress?.city}, {order.shippingAddress?.province}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>{order.createdAtIST || new Date(order.createdAt).toLocaleString()}</td>
                            <td>
                              {order.lineItems?.edges && order.lineItems.edges.length > 0 ? (
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                  {order.lineItems.edges.map((edge, idx) => (
                                    <li key={edge.node.id || idx}>
                                      <span className="fw-semibold">SKU:</span> {edge.node.variant?.sku || '-'}
                                      {', '}<span className="fw-semibold">Qty:</span> {edge.node.quantity}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className='text-center'>
                              <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                                {order.totalPriceSet?.shopMoney?.amount
                                  ? `${order.totalPriceSet.shopMoney.amount} ${order.totalPriceSet.shopMoney.currencyCode}`
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatestRegisteredOne;
