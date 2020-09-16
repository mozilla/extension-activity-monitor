class DropDownController {
  constructor() {
    if (DropDownController.instance instanceof DropDownController) {
      return DropDownController.instance;
    }

    DropDownController.instance = this;
  }

  toggleDropDown(showDropDown) {
    if (this.elem?.toggleDropDown) {
      this.elem.toggleDropDown(showDropDown);
    } else {
      const dropDown = this.elem.nextElementSibling;
      showDropDown
        ? dropDown.classList.add('expanded')
        : dropDown.classList.remove('expanded');
    }
  }

  handleEvent(event) {
    if (event.type === 'click' && event.target !== this.elem) {
      this.hideDropDown();
    }
  }

  triggerDropDown(elem) {
    if (this.elem === elem) {
      this.toggleDropDown(false);
      this.elem = null;
      return;
    }

    this.hideDropDown();
    this.elem = elem;
    document.addEventListener('click', this);
    this.toggleDropDown(true);
  }

  hideDropDown() {
    const { elem } = this;

    if (!elem) {
      return;
    }

    document.removeEventListener('click', this);
    this.toggleDropDown(false);
    this.elem = null;
  }
}

const dropDownController = new DropDownController();
export default dropDownController;
