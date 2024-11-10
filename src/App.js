import React from 'react';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import PatientDashboard from './components/PatientDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" render={() => (
            <Redirect to="/patient-dashboard/Harold/Hurst" />
          )} />
          <Route path="/patient-dashboard/:firstName/:lastName" component={PatientDashboard} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
