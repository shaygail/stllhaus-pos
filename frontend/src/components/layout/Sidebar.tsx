import React from 'react';

const Sidebar: React.FC = () => {
    return (
        <div className="w-64 h-full bg-gray-800 text-white">
            <div className="p-4">
                <h2 className="text-lg font-bold">STLL Haus</h2>
            </div>
            <nav className="mt-4">
                <ul>
                    <li className="p-2 hover:bg-gray-700">
                        <a href="/dashboard">Dashboard</a>
                    </li>
                    <li className="p-2 hover:bg-gray-700">
                        <a href="/orders">Orders</a>
                    </li>
                    <li className="p-2 hover:bg-gray-700">
                        <a href="/products">Products</a>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;