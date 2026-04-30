import { useState } from "react";
import { Edit, Plus, Shapes, Tag, Trash2 } from "lucide-react";

const initialCategories = [
  {
    id: "1",
    name: "Materials",
    description: "Construction material purchases",
    status: "active",
  },
  {
    id: "2",
    name: "Labor",
    description: "Worker wages and labor charges",
    status: "active",
  },
  {
    id: "3",
    name: "Contractor",
    description: "Contractor payments and related costs",
    status: "active",
  },
  {
    id: "4",
    name: "Client Advance",
    description: "Advance amounts received from clients",
    status: "active",
  },
];

function Category() {
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      status: category.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (categoryId) => {
    setCategories(categories.filter((category) => category.id !== categoryId));
  };

  const handleSave = () => {
    if (editingCategory) {
      setCategories(
        categories.map((category) =>
          category.id === editingCategory.id
            ? { ...category, ...formData }
            : category,
        ),
      );
    } else {
      setCategories([
        ...categories,
        { id: String(categories.length + 1), ...formData },
      ]);
    }
    setIsModalOpen(false);
  };

  const filteredCategories = categories.filter((category) => {
    const matchesStatus =
      filterStatus === "all" || category.status === filterStatus;
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Category Management
          </h1>
          <p className="text-gray-600">
            Manage available project categories
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FDB71A" }}
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <Tag className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expense Categories</p>
              <h3 className="text-gray-900">{categories.length}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Categories</p>
              <h3 className="text-gray-900">
                {categories.filter((category) => category.status === "active").length}
              </h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FDB71A20" }}
            >
              <Shapes className="h-6 w-6" style={{ color: "#FDB71A" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Categories</p>
              <h3 className="text-gray-900">{categories.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by category name or description..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
        />
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A] sm:w-48"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-gray-900">{category.name}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {category.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm text-white ${
                        category.status === "active"
                          ? "bg-green-600"
                          : "bg-gray-400"
                      }`}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(category)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        <Edit className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-gray-900">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="mb-2 block text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
                  placeholder="Enter description"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activeCategoryStatus"
                  checked={formData.status === "active"}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      status: event.target.checked ? "active" : "inactive",
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="activeCategoryStatus" className="text-gray-700">
                  Active Category
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#FDB71A" }}
              >
                {editingCategory ? "Update" : "Create"} Category
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Category;
