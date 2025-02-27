// Constants
const CONFIG = {
  API_URL: 'http://localhost:3000',
  CLASSES: {
    HIDDEN: 'hidden',
    RECORD_ITEM: 'record-item',
  },
  SELECTORS: {
    UPDATE_SECTION: '#updateFormSection',
    CREATE_SECTION: '#createFormSection',
    RECORDS_LIST: '#recordsList',
    CREATE_FORM: '#createForm',
    UPDATE_FORM: '#updateForm',
  },
};

// Record class to handle individual record operations
class Record {
  constructor(data) {
    this.id = data.id;
    this.firstname = data.firstname;
    this.lastname = data.lastname;
    this.middlename = data.middlename || '';
    this.address = data.address;
    this.idnumber = data.idnumber;
    this.photo = data.photo;
  }

  toHTML() {
    const div = document.createElement('div');
    div.className = CONFIG.CLASSES.RECORD_ITEM;
    div.innerHTML = `
      <img src="${this.photo}" alt="Photo" class="record-photo">
      <div class="record-info">
        <p><strong>ПІБ:</strong> ${this.lastname} ${this.firstname} ${this.middlename}</p>
        <p><strong>Адреса:</strong> ${this.address}</p>
        <p><strong>ID:</strong> ${this.idnumber}</p>
      </div>
      <div class="record-actions">
        <button onclick="recordsManager.editRecord('${this.id}')" class="btn btn-edit">Редагувати</button>
        <button onclick="recordsManager.deleteRecord('${this.id}')" class="btn btn-delete">Видалити</button>
      </div>
    `;
    return div;
  }
}

// Utility class for handling file operations
class FileUtil {
  static readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
}

// API service class
class RecordAPI {
  static async fetchRecords() {
    const response = await fetch(
      `${CONFIG.API_URL}/records`
    );
    if (!response.ok)
      throw new Error('Failed to fetch records');
    return await response.json();
  }

  static async createRecord(data) {
    const response = await fetch(
      `${CONFIG.API_URL}/records`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok)
      throw new Error('Failed to create record');
    return await response.json();
  }

  static async updateRecord(id, data) {
    const response = await fetch(
      `${CONFIG.API_URL}/records/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok)
      throw new Error('Failed to update record');
    return await response.json();
  }

  static async deleteRecord(id) {
    const response = await fetch(
      `${CONFIG.API_URL}/records/${id}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok)
      throw new Error('Failed to delete record');
  }
}

// Main Records Manager class
class RecordsManager {
  constructor() {
    this.records = [];
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.elements = {
      updateSection: document.querySelector(
        CONFIG.SELECTORS.UPDATE_SECTION
      ),
      createSection: document.querySelector(
        CONFIG.SELECTORS.CREATE_SECTION
      ),
      recordsList: document.querySelector(
        CONFIG.SELECTORS.RECORDS_LIST
      ),
      createForm: document.querySelector(
        CONFIG.SELECTORS.CREATE_FORM
      ),
      updateForm: document.querySelector(
        CONFIG.SELECTORS.UPDATE_FORM
      ),
    };
  }

  attachEventListeners() {
    this.elements.createForm.addEventListener(
      'submit',
      (e) => this.handleCreate(e)
    );
    this.elements.updateForm.addEventListener(
      'submit',
      (e) => this.handleUpdate(e)
    );
    document.addEventListener('DOMContentLoaded', () =>
      this.loadRecords()
    );
  }

  async loadRecords() {
    try {
      this.records = await RecordAPI.fetchRecords();
      this.renderRecords();
    } catch (error) {
      this.handleError('завантаженні записів', error);
    }
  }

  renderRecords() {
    this.elements.recordsList.innerHTML = '';
    this.records
      .map((record) => new Record(record))
      .forEach((record) => {
        this.elements.recordsList.appendChild(
          record.toHTML()
        );
      });
  }

  // Triggers when the form for creating records is submitted
  async handleCreate(e) {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      const photoFile = formData.get('photo');
      if (photoFile && photoFile.size > 0) {
        data.photo = await FileUtil.readFileAsDataURL(
          photoFile
        );
      }

      await RecordAPI.createRecord(data);
      e.target.reset();
      await this.loadRecords();
      alert('Запис успішно створено');
    } catch (error) {
      this.handleError('створенні запису', error);
    }
  }

  // Triggers when the form for updating records is updated
  async handleUpdate(e) {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const recordId = data.recordId;

      const photoFile = formData.get('photo');
      if (photoFile instanceof File && photoFile.size > 0) {
        data.photo = await FileUtil.readFileAsDataURL(
          photoFile
        );
      } else {
        const currentRecord = this.records.find(
          (r) => r.id === recordId
        );
        data.photo = currentRecord.photo;
      }

      await RecordAPI.updateRecord(recordId, data);
      this.cancelUpdate();
      await this.loadRecords();
      alert('Запис успішно оновлено');
    } catch (error) {
      this.handleError('оновленні запису', error);
    }
  }

  editRecord(id) {
    const record = this.records.find((r) => r.id === id);
    if (!record) return;

    const form = this.elements.updateForm;
    form.recordId.value = record.id;
    form.lastname.value = record.lastname;
    form.firstname.value = record.firstname;
    form.middlename.value = record.middlename || '';
    form.address.value = record.address;
    form.idnumber.value = record.idnumber;

    const photoPreview = form.querySelector(
      '.photo-preview'
    );
    photoPreview.innerHTML = `<img src="${record.photo}" alt="Current photo" style="max-width: 200px;">`;

    this.elements.updateSection.classList.remove(
      CONFIG.CLASSES.HIDDEN
    );
    this.elements.createSection.classList.add(
      CONFIG.CLASSES.HIDDEN
    );
  }

  async deleteRecord(id) {
    if (
      !confirm('Ви впевнені, що хочете видалити цей запис?')
    )
      return;

    try {
      await RecordAPI.deleteRecord(id);
      await this.loadRecords();
      alert('Запис успішно видалено');
    } catch (error) {
      this.handleError('видаленні запису', error);
    }
  }

  cancelUpdate() {
    this.elements.updateSection.classList.add(
      CONFIG.CLASSES.HIDDEN
    );
    this.elements.createSection.classList.remove(
      CONFIG.CLASSES.HIDDEN
    );
    this.elements.updateForm.reset();
  }

  handleError(operation, error) {
    console.error(`Error during ${operation}:`, error);
    alert(`Помилка при ${operation}`);
  }
}

// Initialize the application
const recordsManager = new RecordsManager();
