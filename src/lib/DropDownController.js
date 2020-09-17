class DropDownController {
  handleEvent(event) {
    if (event.type === 'click' && event.target !== this.elem) {
      this.hideDropDown();
    }
  }

  toggleDropDown(elem) {
    if (this.elem === elem) {
      this.hideDropDown();
    } else {
      this.showDropDown(elem);
    }
  }

  showDropDown(elem) {
    this.hideDropDown();
    this.elem = elem;
    document.addEventListener('click', this);
    elem.classList.toggle('expanded', true);
  }

  hideDropDown() {
    const { elem } = this;

    if (!elem) {
      return;
    }

    this.elem = null;
    document.removeEventListener('click', this);
    elem.classList.toggle('expanded', false);
  }
}

const dropDownController = new DropDownController();
export default dropDownController;
