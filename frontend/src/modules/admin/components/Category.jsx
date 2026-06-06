import { useState, useEffect, useCallback } from "react";
import { Edit, Plus, Shapes, Tag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../../../shared/hooks/useDebounce";
import apiClient from "../../../shared/services/apiClient";
import Pagination from "../../../shared/components/Pagination";
import ConfirmModal from "../../../shared/components/ConfirmModal";

const LOAD_CATEGORIES_QUERY = `
  query GetCategoriesPage($pageNumber: Int!, $pageSize: Int!, $search: String) {
    categoriesPage(
      pageNumber: $pageNumber
      pageSize: $pageSize
      search: $search
    ) {
      items {
        id
        name
        description
        enable
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
    allCategories: categories {
      enable
      name
      description
    }
  }
`;

const CREATE_CATEGORY_MUTATION = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;

const UPDATE_CATEGORY_MUTATION = `
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      id
    }
  }
`;

const DELETE_CATEGORY_MUTATION = `
  mutation DeleteCategory($id: Int!) {
    deleteCategory(id: $id)
  }
`;

function Category() {
  const getActorName = () => {
    const storedUser = localStorage.getItem("authUser");
    if (!storedUser) return "system";
    try {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.name || "system";
    } catch {
      return "system";
    }
  };

  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overallActiveCount, setOverallActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    enable: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const loadData = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setIsLoading(true);
    }
    setLoadError(null);

    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoadError("Missing authentication token. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      const trimmedSearch = debouncedSearch.trim();
      const response = await apiClient.post(
        "/graphql",
        {
          query: LOAD_CATEGORIES_QUERY,
          variables: {
            pageNumber,
            pageSize,
            search: trimmedSearch || null,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.errors) {
        setLoadError(response.data.errors[0].message);
        toast.error(response.data.errors[0].message);
        return;
      }

      const page = response.data.data.categoriesPage;
      setCategories(page.items);
      setTotalCount(page.totalCount);

      if (response.data?.data?.allCategories) {
        const all = response.data.data.allCategories;
        const searchLower = debouncedSearch.toLowerCase().trim();
        const filteredAll = searchLower 
          ? all.filter(c => 
              (c.name?.toLowerCase().includes(searchLower)) ||
              (c.description?.toLowerCase().includes(searchLower))
            )
          : all;
        
        setOverallActiveCount(filteredAll.filter(c => c.enable).length);
      }
    } catch (err) {
      setLoadError(err.message || "Failed to load categories.");
      toast.error(err.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pageNumber, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      enable: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      enable: category.enable,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const toggleStatus = async (category) => {
    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: UPDATE_CATEGORY_MUTATION,
          variables: {
            input: {
              id: category.id,
              name: category.name,
              description: category.description,
              enable: !category.enable,
              modifiedBy: getActorName()
            }
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success(`Category marked as ${!category.enable ? 'Active' : 'Inactive'}`);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const token = localStorage.getItem("authToken");
    try {
      const response = await apiClient.post(
        "/graphql",
        {
          query: DELETE_CATEGORY_MUTATION,
          variables: { id: itemToDelete.id },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.errors) {
        toast.error(response.data.errors[0].message);
        return;
      }

      toast.success("Category deleted successfully.");
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to delete category.");
    } finally {
      setItemToDelete(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Category name is required";
    if (!formData.description.trim()) errors.description = "Description is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem("authToken");
    try {
      if (editingCategory) {
        const response = await apiClient.post(
          "/graphql",
          {
            query: UPDATE_CATEGORY_MUTATION,
            variables: {
              input: {
                id: editingCategory.id,
                name: formData.name,
                description: formData.description,
                enable: formData.enable,
                modifiedBy: getActorName(),
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Category updated successfully.");
      } else {
        const response = await apiClient.post(
          "/graphql",
          {
            query: CREATE_CATEGORY_MUTATION,
            variables: {
              input: {
                name: formData.name,
                description: formData.description,
                enable: formData.enable,
                createdBy: getActorName(),
              },
            },
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data.errors) {
          toast.error(response.data.errors[0].message);
          return;
        }

        toast.success("Category created successfully.");
      }
      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save category.");
    }
  };


  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

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
          style={{ backgroundColor: "#3D36BE" }}
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <Tag className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Results</p>
              <h3 className="text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Active</p>
              <h3 className="text-gray-900">{overallActiveCount}</h3>
            </div>
          </div>
        </div>
      </div>


      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by category name or description..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE] sm:max-w-sm"
        />
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[820px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-gray-700">Description</th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && categories.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No categories found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-gray-900 capitalize">{category.name}</td>
                    <td className="px-6 py-4 text-gray-900">
                      <div className="max-w-xs truncate" title={category.description}>
                        {category.description || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(category)}
                        className={`relative inline-flex h-7 w-[76px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          category.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                        }`}
                      >
                        <span className={`absolute text-[10px] font-bold text-white ${category.enable ? 'left-2.5' : 'right-1'}`}>
                          {category.enable ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            category.enable ? "translate-x-[52px]" : "translate-x-1"
                          }`}
                        />
                      </button>
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
                          onClick={() => setItemToDelete(category)}
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

          <div className="block md:hidden">
            {isLoading && (
              <div className="p-6 text-center text-gray-500">
                Loading...
              </div>
            )}
            {!isLoading && categories.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No categories found.
              </div>
            )}
            {!isLoading && categories.map((category) => (
              <div
                key={category.id}
                className="border-b border-gray-200 p-4 last:border-0 hover:bg-gray-50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{category.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(category)}
                    className={`relative inline-flex h-7 w-[76px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      category.enable ? "bg-[#34A853]" : "bg-[#EA4335]"
                    }`}
                  >
                    <span className={`absolute text-[10px] font-bold text-white ${category.enable ? 'left-2.5' : 'right-1'}`}>
                      {category.enable ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        category.enable ? "translate-x-[52px]" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                
                <div className="mb-4 space-y-2 text-sm text-gray-600">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Description:</span>
                    <span className="text-gray-500 break-words line-clamp-3">{category.description || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(category)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-6 py-4">
            <Pagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPageNumber(nextPage)}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] overflow-y-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-gray-900">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700">
                  Category Name <span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData({ ...formData, name: event.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                    formErrors.name
                      ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
                      : "border-gray-300 focus:ring-[#3D36BE]"
                  }`}
                  placeholder="Enter category name"
                />
                {renderFieldError(formErrors.name)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700">
                  Description <span className="text-[#EC3F3F]">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => {
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                  }}
                  rows={3}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                    formErrors.description
                      ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
                      : "border-gray-300 focus:ring-[#3D36BE]"
                  }`}
                  placeholder="Enter description"
                />
                {renderFieldError(formErrors.description)}
              </div>

              <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-500">Status</span>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    id="activeCategoryStatus"
                    checked={formData.enable}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        enable: event.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded border-gray-300 accent-[#3D36BE]"
                  />
                  <span className="text-gray-700">Active Category</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#3D36BE" }}
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

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default Category;




