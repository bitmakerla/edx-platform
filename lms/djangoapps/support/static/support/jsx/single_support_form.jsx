/* global gettext */
/* eslint one-var: ["error", "always"] */
/* eslint no-alert: "error" */

import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import ShowErrors from './errors_list';
import LoggedInUser from './logged_in_user';
import LoggedOutUser from './logged_out_user';
import Success from './success';

const initialFormErrors = {
  course: undefined,
  subject: undefined,
  message: undefined,
  request: undefined,
};

class RenderForm extends React.Component {
  constructor(props) {
    super(props);
    this.submitFormUrl = this.props.context.submitFormUrl;
    this.userInformation = this.props.context.user;
    const course = this.userInformation ? this.userInformation.course_id : '';
    this.courseDiscussionURL = '/courses/{course_id}/discussion/forum';
    this.learnerSupportCenterURL = 'https://support.edx.org/';
    this.submitButton = null;
    this.state = {
      currentRequest: null,
      errorList: initialFormErrors,
      success: false,
      activeSuggestion: 0,
      suggestions: [],
      formData: {
        course,
        subject: '',
        message: '',
      },
    };
    this.formValidationErrors = {
      course: gettext('Select a course or select "Not specific to a course" for your support request.'),
      subject: gettext('Select a subject for your support request.'),
      message: gettext('Enter some details for your support request.'),
      request: gettext('Something went wrong. Please try again later.'),
    };
    this.handleClick = this.handleClick.bind(this);
    this.reDirectUser = this.reDirectUser.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.formOnChangeCallback = this.formOnChangeCallback.bind(this);
    this.handleSearchButton = this.handleSearchButton.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.handleSuggestionClick = this.handleSuggestionClick.bind(this);
    this._ignoreBlur = false;
    this.handleBlur = this.handleBlur.bind(this);
  }

  setIgnoreBlur(ignore) {
    this._ignoreBlur = ignore;
  }

  getFormDataFromState() {
    return this.state.formData;
  }

  getFormErrorsFromState() {
    return this.state.errorList;
  }

  clearErrorState() {
    const formErrorsInState = this.getFormErrorsFromState();
    Object.keys(formErrorsInState).map((index) => {
      formErrorsInState[index] = undefined;
      return formErrorsInState;
    });
  }

  // eslint-disable-next-line class-methods-use-this
  scrollToTop() {
    return window.scrollTo(0, 0);
  }

  formHasErrors() {
    const errorsList = this.getFormErrorsFromState();
    return Object.keys(errorsList).filter(err => errorsList[err] !== undefined).length > 0;
  }

  updateErrorInState(key, error) {
    const errorList = this.getFormErrorsFromState();
    errorList[key] = error;
    this.setState({
      errorList,
    });
  }

  formOnChangeCallback(event) {
    const formData = this.getFormDataFromState();
    formData[event.target.id] = event.target.value;
    this.setState({ formData });
  }

  showWarningMessage() {
    const formData = this.getFormDataFromState(),
      selectedSubject = formData.subject;
    return formData && selectedSubject === 'Course Content';
  }

  showDiscussionButton() {
    const formData = this.getFormDataFromState(),
      selectedCourse = formData.course;
    return formData && (selectedCourse !== '' && selectedCourse !== 'Not specific to a course');
  }

  reDirectUser(event) {
    event.preventDefault();
    const formData = this.getFormDataFromState();
    window.location.href = this.courseDiscussionURL.replace('{course_id}', formData.course);
  }

  handleClick(event) {
    event.preventDefault();
    this.submitButton = event.currentTarget;
    this.submitButton.setAttribute('disabled', true);
    const formData = this.getFormDataFromState();
    this.clearErrorState();
    this.validateFormData(formData);
    if (this.formHasErrors()) {
      this.submitButton.removeAttribute('disabled');
      return this.scrollToTop();
    }
    this.createZendeskTicket(formData);
  }

  createZendeskTicket(formData) {
    const url = this.submitFormUrl,
      request = new XMLHttpRequest(),
      data = {
        comment: {
          body: formData.message,
        },
        subject: formData.subject, // Zendesk API requires 'subject'
        custom_fields: [{
          id: this.props.context.customFields.course_id,
          value: formData.course,
        }],
        tags: this.props.context.tags,
      };
    request.open('POST', url, true);
    request.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
    request.setRequestHeader('X-CSRFToken', $.cookie('csrftoken'));
    request.send(JSON.stringify(data));
    request.onreadystatechange = function success() {
      if (request.readyState === 4) {
        this.submitButton.removeAttribute('disabled');
        if (request.status === 201) {
          this.setState({
            success: true,
          });
        }
      }
    }.bind(this);

    request.onerror = function error() {
      this.updateErrorInState('request', this.formValidationErrors.request);
      this.submitButton.removeAttribute('disabled');
      this.scrollToTop();
    }.bind(this);
  }
  validateFormData(formData) {
    const { course, subject, message } = formData;

    let courseError,
      subjectError,
      messageError;

    courseError = (course === '') ? this.formValidationErrors.course : undefined;
    this.updateErrorInState('course', courseError);
    subjectError = (subject === '') ? this.formValidationErrors.subject : undefined;
    this.updateErrorInState('subject', subjectError);
    messageError = (message === '') ? this.formValidationErrors.message : undefined;
    this.updateErrorInState('message', messageError);
  }

  renderSuccess() {
    return (
      <Success
        platformName={this.props.context.platformName}
        homepageUrl={this.props.context.homepageUrl}
        dashboardUrl={this.props.context.dashboardUrl}
        isLoggedIn={this.userInformation !== undefined}
      />
    );
  }

  async handleInputChange(event) {
    event.preventDefault();
    const queryString = event.target.value;
    if (queryString.length > 2) {
      let suggestions = [];
//       await fetch(`${this.learnerSupportCenterURL}/hc/api/internal/instant_search.json?query=${queryString}&locale=en-us`, { headers: {
//         'Content-Type': 'application/json',
//       }}).then((response) => {
//         suggestions = response.json.results;
//         this.setState({ suggestions });
//       });
      suggestions = { results: [{ title: 'How do self-paced \u003cem\u003ecourses\u003c/em\u003e work?', category_title: 'Courses', url: '/hc/search/instant_click?data=BAh7CjoHaWRpBJD%2BTgw6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiQS9oYy9lbi11cy9hcnRpY2xlcy8yMDY1MDM1NjgtSG93LWRvLXNlbGYtcGFjZWQtY291cnNlcy13b3JrLQY7B1Q6DnNlYXJjaF9pZEkiKTZhZTQ1ZmZjLTM5ZTctNDg5Yi04NGIyLWNkNWFlNWMwMzIyMQY7B0Y6CXJhbmtpBg%3D%3D--f8c31679dce748e92dc0fa88cb3ad1f0fff9eb18' }, { title: 'Can I re-take a \u003cem\u003ecourse\u003c/em\u003e?', category_title: 'Courses', url: '/hc/search/instant_click?data=BAh7CjoHaWRpBK7%2BTgw6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiOS9oYy9lbi11cy9hcnRpY2xlcy8yMDY1MDM1OTgtQ2FuLUktcmUtdGFrZS1hLWNvdXJzZS0GOwdUOg5zZWFyY2hfaWRJIik2YWU0NWZmYy0zOWU3LTQ4OWItODRiMi1jZDVhZTVjMDMyMjEGOwdGOglyYW5raQc%3D--e5186e74d5866ace8ac8a191398df42ea2571497' }, { title: 'About \u003cem\u003ecourse\u003c/em\u003e wikis', category_title: 'Courses', url: '/hc/search/instant_click?data=BAh7CjoHaWRsKwh%2FK6%2FRUwA6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiNy9oYy9lbi11cy9hcnRpY2xlcy8zNjAwMDAyMDM2NDctQWJvdXQtY291cnNlLXdpa2lzBjsHVDoOc2VhcmNoX2lkSSIpNmFlNDVmZmMtMzllNy00ODliLTg0YjItY2Q1YWU1YzAzMjIxBjsHRjoJcmFua2kI--98329a369ef524a9b0cdfa86ca316c454c49d8d8' }, { title: 'What does it cost to take a \u003cem\u003ecourse\u003c/em\u003e?', category_title: 'Account Basics', url: '/hc/search/instant_click?data=BAh7CjoHaWRpBHaLSgw6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiRS9oYy9lbi11cy9hcnRpY2xlcy8yMDYyMTE5NTgtV2hhdC1kb2VzLWl0LWNvc3QtdG8tdGFrZS1hLWNvdXJzZS0GOwdUOg5zZWFyY2hfaWRJIik2YWU0NWZmYy0zOWU3LTQ4OWItODRiMi1jZDVhZTVjMDMyMjEGOwdGOglyYW5raQk%3D--7bd1a51841935cb60a24e4cc801ac8c97e3ef99f' }, { title: 'How do I take a \u003cem\u003ecourse\u003c/em\u003e for free?', category_title: 'Certificates', url: '/hc/search/instant_click?data=BAh7CjoHaWRpBHlFVQw6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiQi9oYy9lbi11cy9hcnRpY2xlcy8yMDY5MTQ5MzctSG93LWRvLUktdGFrZS1hLWNvdXJzZS1mb3ItZnJlZS0GOwdUOg5zZWFyY2hfaWRJIik2YWU0NWZmYy0zOWU3LTQ4OWItODRiMi1jZDVhZTVjMDMyMjEGOwdGOglyYW5raQo%3D--7705141b6b75288fc4c8bc9d6fbce4479d230096' }, { title: 'How do I start my \u003cem\u003ecourse\u003c/em\u003e?', category_title: 'Courses', url: '/hc/search/instant_click?data=BAh7CjoHaWRsKwi23fLTUwA6CXR5cGVJIgxhcnRpY2xlBjoGRVQ6CHVybEkiPi9oYy9lbi11cy9hcnRpY2xlcy8zNjAwMzgxOTQ2MTQtSG93LWRvLUktc3RhcnQtbXktY291cnNlLQY7B1Q6DnNlYXJjaF9pZEkiKTZhZTQ1ZmZjLTM5ZTctNDg5Yi04NGIyLWNkNWFlNWMwMzIyMQY7B0Y6CXJhbmtpCw%3D%3D--40b736246e1bc6b163867691827950d80ea3b128' }] }.results;
      this.setState({ suggestions });
    } else {
      this.setState({
        suggestions: [],
        activeSuggestion: 0,
      });
    }
  }

  onKeyDown(event) {
    const { activeSuggestion, suggestions } = this.state;

    if (event.keyCode === 13) { // User pressed the enter key
      window.location.href = this.learnerSupportCenterURL + suggestions[activeSuggestion].url;
    } else if (event.keyCode === 38) { // User pressed the up arrow
      if (activeSuggestion === 0) { return; }

      this.setState({ activeSuggestion: activeSuggestion - 1 });
    } else if (event.keyCode === 40) { // User pressed the down arrow
      if (activeSuggestion - 1 === suggestions.length) { return; }

      this.setState({ activeSuggestion: activeSuggestion + 1 });
    }
  }

  handleBlur(event) {
    if (!this._ignoreBlur) {
      this.setState({
        suggestions: [],
        activeSuggestion: 0,
      });
    }
  }

  handleSearchButton(event) {
    event.preventDefault();
    let queryString = document.getElementById('query').value;
    queryString = queryString.replace(' ', '+');

    window.location.href = `${this.learnerSupportCenterURL}/hc/en-us/search?utf8=✓&query=${queryString}`;
  }

  handleSuggestionClick(url) {
    window.location.href = this.learnerSupportCenterURL + url;
  }

  renderSupportForm() {
    const { activeSuggestion, suggestions } = this.state;
    let userElement,
      suggestionsListComponent = null;
    if (this.userInformation) {
      userElement = (<LoggedInUser
        userInformation={this.userInformation}
        onChangeCallback={this.formOnChangeCallback}
        handleClick={this.handleClick}
        showWarning={this.showWarningMessage()}
        showDiscussionButton={this.showDiscussionButton()}
        reDirectUser={this.reDirectUser}
        errorList={this.getFormErrorsFromState()}
      />);
    } else {
      userElement = (<LoggedOutUser
        platformName={this.props.context.platformName}
        loginQuery={this.props.context.loginQuery}
        supportEmail={this.props.context.supportEmail}
      />);
    }
    if (suggestions.length) {
      suggestionsListComponent = (
        <ul className="suggestions">
          {suggestions.map((suggestion, index) => {
            let className;

            if (index === activeSuggestion) {
              className = 'suggestion-active';
            }
            return (
              <li
                className={className}
                key={index}
                onMouseDown={() => this.setIgnoreBlur(true)}
                onClick={() => this.handleSuggestionClick(suggestion.url)}
                onMouseOver={() => this.setState({ activeSuggestion: index })}
              >
                <div dangerouslySetInnerHTML={{ __html: suggestion.title }} />
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <div className="contact-us-wrapper">

        {/* Note: not using Paragon bc component shows in the DOM but not rendered, even when using
         version 2.6.4. */}

        <div className="row">
          <div className="col-sm-12">
            <h2>{gettext('Contact Us')}</h2>
          </div>
        </div>
        <div className="row form-errors">
          <ShowErrors errorList={this.getFormErrorsFromState()} hasErrors={this.formHasErrors()} />
        </div>

        <div className="row">
          <div className="col-sm-12">
            <p>{gettext('Find answers to the top questions asked by learners.')}</p>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-8">
            <input name="utf8" type="hidden" value="✓" />
            <input
              type="search"
              className="form-control"
              id="query"
              placeholder="Search the Learner Help Center"
              autoComplete="off"
              onChange={this.handleInputChange}
              onKeyDown={this.onKeyDown}
              onBlur={this.handleBlur}
            />
          </div>
          <div className="col-sm-4">
            <button
              className="btn btn-primary btn-submit btn"
              type="button"
              onClick={this.handleSearchButton}
            >
              Search
            </button>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-8">
            {suggestionsListComponent}
          </div>
        </div>

        {userElement}
      </div>
    );
  }

  render() {
    if (this.state.success) {
      return this.renderSuccess();
    }
    return this.renderSupportForm();
  }
}

RenderForm.propTypes = {
  context: PropTypes.shape({
    customFields: PropTypes.object,
    dashboardUrl: PropTypes.string,
    homepageUrl: PropTypes.string,
    marketingUrl: PropTypes.string,
    loginQuery: PropTypes.string,
    platformName: PropTypes.string,
    submitFormUrl: PropTypes.string,
    supportEmail: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    user: PropTypes.object,
  }).isRequired,
};

export class SingleSupportForm {
  constructor(context) {
    ReactDOM.render(
      <RenderForm context={context} />,
      document.getElementById('root'),
    );
  }
}
