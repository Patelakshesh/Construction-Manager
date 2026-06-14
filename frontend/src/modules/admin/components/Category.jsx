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
  const [isSaving, setIsSaving] = useState(false);
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

    setIsSaving(true);
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
      setIsSaving(false);
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

    setIsSaving(true);
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
          setIsSaving(false);
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
          setIsSaving(false);
          return;
        }

        toast.success("Category created successfully.");
      }
      setIsModalOpen(false);
      loadData(false);
    } catch (err) {
      toast.error(err?.message || "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldError = (message) =>
    message ? <p className="mt-1 text-xs text-[#EC3F3F]">{message}</p> : null;

  const getFieldClassName = (hasError) =>
    `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${hasError
      ? "border-[#EC3F3F] focus:ring-[#EC3F3F]"
      : "border-gray-300 focus:ring-[#3D36BE]"
    }`;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl font-sans">
            Category Management
          </h1>
          <p className="text-[#4E5159] mt-1 text-base font-normal">
            Manage available project categories
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="h-11 px-8 bg-[#3D35BE] text-white text-base font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 font-sans"
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Total Categories Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Shapes className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{totalCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Total Categories</span>
          </div>
        </div>

        {/* Total Active Categories Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3C368D 0deg, #857FF4 100%)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Tag className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[32px] font-bold text-[#353535] leading-none">{overallActiveCount}</span>
            <span className="text-base text-[#4E5159] font-normal">Active Categories</span>
          </div>
        </div>
      </div>

      {/* Main Container Card (Table & Actions) */}
      <div 
        className="w-full bg-white flex flex-col gap-7 min-w-0" 
        style={{ 
          paddingLeft: 24, 
          paddingRight: 24, 
          paddingTop: 30, 
          paddingBottom: 30, 
          borderTopRightRadius: 20, 
          borderBottomRightRadius: 20, 
          borderBottomLeftRadius: 20 
        }}
      >
        <div 
          className="w-full flex flex-col overflow-hidden rounded-lg min-w-0" 
          style={{ outline: '1px rgba(61, 53, 190, 0.26) solid' }}
        >
          {/* Header Row: Search Input */}
          <div className="w-full bg-white p-6 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="w-full sm:max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by category name or description..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg border border-[#C8D9EF] text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans"
              />
              <svg className="w-5 h-5 absolute left-4 text-[#717579]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {loadError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-red-600 font-sans">
              {loadError}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-[#F0EFFF] border-b border-[#9792E7]">
                <tr className="h-[68px]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#5B6065] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 font-sans">
                      Loading categories...
                    </td>
                  </tr>
                )}
                {!isLoading && categories.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 font-sans">
                      No categories found.
                    </td>
                  </tr>
                )}
                {!isLoading && categories.map((category) => (
                  <tr
                    key={category.id}
                    className="h-[78px] transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal capitalize font-sans">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5B6065] font-normal font-sans">
                      {category.description || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(category)}
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {category.enable ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-sm font-medium text-[#01B6A8] px-3 py-1 font-sans">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-base font-semibold text-[#F15F7F] px-3 py-1 font-sans">
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(category)}
                          className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden bg-white divide-y divide-gray-100">
            {isLoading && (
              <div className="p-6 text-center text-gray-500 font-sans">
                Loading...
              </div>
            )}
            {!isLoading && categories.length === 0 && (
              <div className="p-6 text-center text-gray-500 font-sans">
                No categories found.
              </div>
            )}
            {!isLoading && categories.map((category) => (
              <div
                key={category.id}
                className="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-base font-sans">{category.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(category)}
                    className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {category.enable ? (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#EFFFFE] border border-[#A0EBE5] text-xs font-semibold text-[#01B6A8] px-2.5 py-1 font-sans">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#FFF1F0] border border-[#F5CDD5] text-xs font-semibold text-[#F15F7F] px-2.5 py-1 font-sans">
                        Inactive
                      </span>
                    )}
                  </button>
                </div>

                <div className="mb-4 space-y-2 text-sm text-[#5B6065]">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#3E424E] font-sans">Description:</span>
                    <span className="text-[#5B6065] break-words line-clamp-3 font-sans">{category.description || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 font-sans">
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100 text-[#2945AC]"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(category)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#F15F7F]"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
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
            <h3 className="mb-6 text-gray-900 font-bold text-xl font-sans">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-gray-700 font-medium font-sans">
                  Category Name <span className="text-[#EC3F3F]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData({ ...formData, name: event.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  className={`${getFieldClassName(formErrors.name)} font-sans`}
                  placeholder="Enter category name"
                />
                {renderFieldError(formErrors.name)}
              </div>

              <div>
                <label className="mb-2 block text-gray-700 font-medium font-sans">
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
                  className={`${getFieldClassName(formErrors.description)} font-sans`}
                  placeholder="Enter description"
                />
                {renderFieldError(formErrors.description)}
              </div>

              <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-500 font-sans font-medium">Status</span>
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
                  <span className="text-gray-700 font-sans">Active Category</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3 font-sans">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg px-4 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans"
                style={{ backgroundColor: "#3D36BE" }}
              >
                {isSaving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-[#3D35BE] bg-white text-[#3D35BE] transition-colors hover:bg-[#F0EFFF] disabled:opacity-50 disabled:cursor-not-allowed font-bold font-sans"
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
        isLoading={isSaving}
      />
    </div>
  );
}

export default Category;
