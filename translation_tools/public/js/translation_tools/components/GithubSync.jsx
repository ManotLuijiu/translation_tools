import React, { useState } from 'react';
import GitHubIcon from './GithubIcon';

export default function GithubSync({ selectedFile }) {
  const [repoUrl, setRepoUrl] = useState(
    'https://github.com/ManotLuijiu/erpnext-thai-translation.git'
  );
  const [branch, setBranch] = useState('main');
  const [fileList, setFileList] = useState([]);
  const [selectedRepoFile, setSelectedRepoFile] = useState(null);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFindFiles = () => {
    frappe.call({
      method: 'translation_tools.api.github_sync.find_translation_files',
      args: { repo_url: repoUrl, branch },
      callback: (r) => {
        setFileList(r.message?.files || []);
        setSelectedRepoFile(null);
        setPreviewSummary(null);
      },
    });
  };

  const handlePreviewSync = () => {
    if (!selectedRepoFile) return;

    frappe.call({
      method: 'translation_tools.api.github_sync.preview_sync',
      args: {
        repo_url: repoUrl,
        branch,
        repo_files: [selectedRepoFile],
        local_file_path: selectedFile?.file_path || '',
      },
      callback: (r) => {
        setPreviewSummary(r.message?.preview || null);
      },
    });
  };

  const handleApplySync = () => {
    if (!selectedRepoFile) return;

    frappe.call({
      method: 'translation_tools.api.github_sync.apply_sync',
      args: {
        repo_url: repoUrl,
        branch,
        repo_files: [selectedRepoFile],
        local_file_path: selectedFile?.file_path || '',
      },
      callback: (r) => {
        if (r.message?.success) {
          frappe.msgprint('Sync successful');
          setIsDialogOpen(false);
        }
      },
    });
  };

  return (
    <div className="github-sync-container">
      <button
        className="btn btn-default btn-sm"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="custom-github-icon flex justify-center items-center space-x-px">
          <GitHubIcon />
          <span>Sync with GitHub</span>
        </div>
      </button>

      {isDialogOpen && (
        <div className="">
          <div className="">
            <h3>GitHub Sync</h3>
            <button className="" onClick={() => setIsDialogOpen(false)}>
              ×
            </button>
          </div>
          <div className="">
            <label>
              Repository URL:
              <input
                type="text"
                className=""
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </label>
            <label>
              Branch:
              <input
                type="text"
                className=""
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </label>
            <button className="" onClick={handleFindFiles}>
              Find Files
            </button>

            <ul className="">
              {fileList.map((file) => (
                <li
                  key={file.path}
                  className={`file-item ${selectedRepoFile === file.path ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRepoFile(file.path);
                    setPreviewSummary(null);
                  }}
                >
                  {file.path}
                </li>
              ))}
            </ul>

            {selectedRepoFile && (
              <>
                <button className="" onClick={handlePreviewSync}>
                  Preview Sync
                </button>
                <button className="" onClick={handleApplySync}>
                  Apply Sync
                </button>
              </>
            )}

            {previewSummary && (
              <div className="preview-summary">
                <p>Added: {previewSummary.added}</p>
                <p>Updated: {previewSummary.updated}</p>
                <p>Unchanged: {previewSummary.unchanged}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
