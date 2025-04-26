import React, { useState } from 'react';
import {
  useGetGlossaryTerms,
  useAddGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
  useGetERPNextModules,
  // GlossaryTerm,
} from '../api';

export default function GlossaryManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [formData, setFormData] = useState({
    source_term: '',
    thai_translation: '',
    context: '',
    category: '',
    module: '',
    is_approved: false,
  });
  const [statusMessage, setStatusMessage] = useState(null);

  // API hooks
  const {
    data: termsData,
    error: termsError,
    isLoading: isLoadingTerms,
    refetch: refreshTerms,
  } = useGetGlossaryTerms();
  const { data: modulesData, isLoading: isLoadingModules } =
    useGetERPNextModules();

  console.log('isLoadingModules', isLoadingModules);
  const addTerm = useAddGlossaryTerm();
  const updateTerm = useUpdateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      source_term: '',
      thai_translation: '',
      context: '',
      category: '',
      module: '',
      is_approved: false,
    });
    setSelectedTerm(null);
  };

  const openEditDialog = (term) => {
    setSelectedTerm(term);
    setFormData({
      source_term: term.source_term,
      thai_translation: term.thai_translation,
      context: term.context,
      category: term.category,
      module: term.module,
      is_approved: term.is_approved,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (term) => {
    setSelectedTerm(term);
    setIsDeleteDialogOpen(true);
  };

  const handleAddTerm = async () => {
    try {
      if (!formData.source_term || !formData.thai_translation) {
        setStatusMessage({
          type: 'error',
          message: 'Source term and Thai translation are required',
        });
        return;
      }

      const result = await addTerm.mutateAsync(formData);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term added successfully',
        });
        resetForm();
        setIsAddDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to add term',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
      });
    }
  };

  const handleUpdateTerm = async () => {
    try {
      if (
        !selectedTerm ||
        !formData.source_term ||
        !formData.thai_translation
      ) {
        setStatusMessage({
          type: 'error',
          message: 'Source term and Thai translation are required',
        });
        return;
      }

      const result = await updateTerm.mutateAsync({
        name: selectedTerm.name,
        ...formData,
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term updated successfully',
        });
        resetForm();
        setIsEditDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to update term',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
      });
    }
  };

  const handleDeleteTerm = async () => {
    try {
      if (!selectedTerm) return;

      const result = await deleteTerm.mutateAsync(selectedTerm.name);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term deleted successfully',
        });
        resetForm();
        setIsDeleteDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to delete term',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
      });
    }
  };

  const filteredTerms =
    termsData?.filter((term) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        term.source_term.toLowerCase().includes(searchLower) ||
        term.thai_translation.toLowerCase().includes(searchLower)
      );
    }) || [];

  const categories = [
    { value: 'Business', label: 'Business' },
    { value: 'Technical', label: 'Technical' },
    { value: 'UI', label: 'UI' },
    { value: 'Date/Time', label: 'Date/Time' },
    { value: 'Status', label: 'Status' },
  ];

  return (
    <div className="glossary-manager">
      <div className="page-header">
        <h2 className="heading">Translation Glossary</h2>

        <button
          className="btn btn-primary"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <span className="icon-plus"></span>
          Add Term
        </button>
      </div>

      <div className="search-box">
        <span className="search-icon">
          <span className="icon-search"></span>
        </span>
        <input
          type="text"
          className="form-control"
          placeholder="Search terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoadingTerms ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : termsError ? (
        <div className="frappe-alert error">
          <span className="indicator red"></span>
          <div className="alert-body">
            <h5>Error</h5>
            <div>{termsError.message || 'Failed to load glossary terms'}</div>
          </div>
        </div>
      ) : filteredTerms.length === 0 ? (
        <div className="no-results">
          {searchTerm
            ? 'No terms match your search'
            : 'No glossary terms found. Click "Add Term" to create one.'}
        </div>
      ) : (
        <div className="frappe-card">
          <div className="frappe-list">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>English Term</th>
                  <th>Thai Translation</th>
                  <th>Category</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th width="100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.map((term) => (
                  <tr key={term.name}>
                    <td className="bold">{term.source_term}</td>
                    <td>{term.thai_translation}</td>
                    <td>{term.category || '-'}</td>
                    <td>{term.module || '-'}</td>
                    <td>
                      {term.is_approved ? (
                        <span className="indicator-pill green">Approved</span>
                      ) : (
                        <span className="indicator-pill gray">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-icon btn-sm"
                          onClick={() => openEditDialog(term)}
                        >
                          <span className="icon-pencil"></span>
                        </button>
                        <button
                          className="btn btn-icon btn-sm text-danger"
                          onClick={() => openDeleteDialog(term)}
                        >
                          <span className="icon-trash"></span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {isAddDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add New Glossary Term</h4>
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <p className="text-muted">
                  Add a new term to the translation glossary.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="control-label" htmlFor="source_term">
                      English Term *
                    </label>
                    <input
                      type="text"
                      id="source_term"
                      name="source_term"
                      className="form-control"
                      value={formData.source_term || ''}
                      onChange={handleInputChange}
                      placeholder="Enter source term"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label" htmlFor="thai_translation">
                      Thai Translation *
                    </label>
                    <input
                      type="text"
                      id="thai_translation"
                      name="thai_translation"
                      className="form-control"
                      value={formData.thai_translation || ''}
                      onChange={handleInputChange}
                      placeholder="Enter Thai translation"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="control-label" htmlFor="context">
                    Context
                  </label>
                  <textarea
                    id="context"
                    name="context"
                    className="form-control"
                    value={formData.context || ''}
                    onChange={handleInputChange}
                    placeholder="Provide context for this term (optional)"
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="control-label" htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="form-control"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="control-label" htmlFor="module">
                      Module
                    </label>
                    <select
                      id="module"
                      name="module"
                      className="form-control"
                      value={formData.module || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Select module</option>
                      {modulesData?.map((module) => (
                        <option key={module.name} value={module.name}>
                          {module.module_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="checkbox">
                    <label>
                      <input
                        type="checkbox"
                        id="is_approved"
                        name="is_approved"
                        checked={!!formData.is_approved}
                        onChange={handleInputChange}
                      />
                      Approved Term
                    </label>
                  </div>
                </div>

                {statusMessage && (
                  <div
                    className={`alert alert-${statusMessage.type === 'success' ? 'success' : 'danger'}`}
                  >
                    <div className="alert-icon">
                      {statusMessage.type === 'success' ? (
                        <span className="indicator green"></span>
                      ) : (
                        <span className="indicator red"></span>
                      )}
                    </div>
                    <div className="alert-body">
                      <h5>
                        {statusMessage.type === 'success' ? 'Success' : 'Error'}
                      </h5>
                      <div>{statusMessage.message}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddTerm}
                  disabled={addTerm.isLoading}
                >
                  {addTerm.isLoading ? (
                    <>
                      <span className="spinner-sm"></span>
                      Adding...
                    </>
                  ) : (
                    'Save Term'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Glossary Term</h4>
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <p className="text-muted">
                  Update the translation glossary term.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="control-label" htmlFor="edit_source_term">
                      English Term *
                    </label>
                    <input
                      type="text"
                      id="edit_source_term"
                      name="source_term"
                      className="form-control"
                      value={formData.source_term || ''}
                      onChange={handleInputChange}
                      placeholder="Enter source term"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label
                      className="control-label"
                      htmlFor="edit_thai_translation"
                    >
                      Thai Translation *
                    </label>
                    <input
                      type="text"
                      id="edit_thai_translation"
                      name="thai_translation"
                      className="form-control"
                      value={formData.thai_translation || ''}
                      onChange={handleInputChange}
                      placeholder="Enter Thai translation"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="control-label" htmlFor="edit_context">
                    Context
                  </label>
                  <textarea
                    id="edit_context"
                    name="context"
                    className="form-control"
                    value={formData.context || ''}
                    onChange={handleInputChange}
                    placeholder="Provide context for this term (optional)"
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="control-label" htmlFor="edit_category">
                      Category
                    </label>
                    <select
                      id="edit_category"
                      name="category"
                      className="form-control"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="control-label" htmlFor="edit_module">
                      Module
                    </label>
                    <select
                      id="edit_module"
                      name="module"
                      className="form-control"
                      value={formData.module || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Select module</option>
                      {modulesData?.map((module) => (
                        <option key={module.name} value={module.name}>
                          {module.module_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="checkbox">
                    <label>
                      <input
                        type="checkbox"
                        id="edit_is_approved"
                        name="is_approved"
                        checked={!!formData.is_approved}
                        onChange={handleInputChange}
                      />
                      Approved Term
                    </label>
                  </div>
                </div>

                {statusMessage && (
                  <div
                    className={`alert alert-${statusMessage.type === 'success' ? 'success' : 'danger'}`}
                  >
                    <div className="alert-icon">
                      {statusMessage.type === 'success' ? (
                        <span className="indicator green"></span>
                      ) : (
                        <span className="indicator red"></span>
                      )}
                    </div>
                    <div className="alert-body">
                      <h5>
                        {statusMessage.type === 'success' ? 'Success' : 'Error'}
                      </h5>
                      <div>{statusMessage.message}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUpdateTerm}
                  disabled={updateTerm.isLoading}
                >
                  {updateTerm.isLoading ? (
                    <>
                      <span className="spinner-sm"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Term'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Confirm Deletion</h4>
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <p>Are you sure you want to delete this term?</p>
                <p className="text-danger">
                  This will permanently delete the glossary term "
                  {selectedTerm?.source_term}". This action cannot be undone.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteTerm}
                  disabled={deleteTerm.isLoading}
                >
                  {deleteTerm.isLoading ? (
                    <>
                      <span className="spinner-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
