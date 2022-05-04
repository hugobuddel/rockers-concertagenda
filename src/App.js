import React from "react";
import SwipeableViews from "react-swipeable-views";

import "./App.css";
import "./App-mobile.css";
import "./normalize.css";
import EventBlock from "./mods/EventBlock";
import HeaderMenu from "./mods/HeaderMenu";
import FilterMenu from "./mods/FilterMenu";
import OpenScreen from "./mods/OpenScreen";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openScreenHidden: false,
      openScreenMoving: false,
      swipeState: 1, // 0: filter; 1: app; 2: text;
      names: [],
      locations: {},
      filterSettings: {
        podia: {},
        daterange: {
          lower: "2022-01-01",
          upper: "2022-09-31",
        },
      },
    };
    this.updateSwitch = this.updateSwitch.bind(this);
    this.updateSwipeStateFilter = this.updateSwipeStateFilter.bind(this);
    this.updateSwipeStateExplainer = this.updateSwipeStateExplainer.bind(this);
    this.appProcessFilterChange = this.appProcessFilterChange.bind(this);
    this.abstractSwitchUpdater = this.abstractSwitchUpdater.bind(this);
    this.getScraperNamesAndLocations = this.getScraperNamesAndLocations.bind(this);
  }

  hasFetchedData = false;
  isFetchingData = false;

  appProcessFilterChange(filterSettings) {
    this.setState({
      filterSettings,
    });
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({
        openScreenHidden: true,
      })
    }, 3000)
    setTimeout(() => {
      this.setState({
        openScreenMoving: true,
      })
    }, 2000)
  }

  componentDidUpdate() {
    if (!this.hasFetchedData && !this.isFetchingData)
      this.getScraperNamesAndLocations()
  }
  async getScraperNamesAndLocations() {

    this.isFetchingData = true;
    const getTimeStamps = fetch("./timestamps.json", {})
      .then((response) => {
        return response.json();
      })
      .then(timestamps => {
        this.setState({
          names: Object.keys(timestamps).filter(key => key !== 'metalfan'),
        });
      })

    const getLocations = fetch("./locations.json", {}).then((response) => {
      return response.json();
    }).then(locations => {
      this.setState({
        locations: locations,
      });
    })

    Promise.all([getTimeStamps, getLocations]).then(promisesResult => {
      this.hasFetchedData = true;
      this.isFetchingData = false;
    }).catch((err) => {
      this.isFetchingData = false;
      console.error(err);
    });

  }

  abstractSwitchUpdater(setStateFunc, setStateParam) {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
    setTimeout(() => {
      setStateFunc(setStateParam)
    }, 300);
  }

  updateSwitch(index, indexLatest, meta) {
    this.abstractSwitchUpdater((index) => {
      this.setState({
        swipeState: index,
      });
    }, index)
  }

  updateSwipeStateExplainer() {
    this.abstractSwitchUpdater(() => {
      this.setState({
        swipeState: this.state.swipeState === 1 ? 2 : 1,
      });
    })
  }

  updateSwipeStateFilter() {
    this.abstractSwitchUpdater(() => {
      this.setState({
        swipeState: this.state.swipeState === 0 ? 1 : 0,
      })
    })
  }

  appTitleToExplainer() {
    if (this.state.swipeState === 0) {
      return "";
    }
    return this.state.swipeState === 1 ? `Uitleg 👉` : `👈 Agenda`;
  }

  appTitleToFilter() {
    if (this.state.swipeState === 2) {
      return "";
    }
    return this.state.swipeState === 1 ? `👈 Filter` : `Agenda 👉`;
  }

  appBanner(title) {
    return (
      <div id="app-banner" className="app-banner cursive-font">
        <OpenScreen hidden={this.state.openScreenHidden} moving={this.state.openScreenMoving} />
        <h1 className="app-title">{title}</h1>
        <span className="app-title-right">
          <span
            onClick={this.updateSwipeStateFilter}
            className="app-title-right-button"
          >
            {this.appTitleToFilter()}
          </span>{" "}
          <span
            onClick={this.updateSwipeStateExplainer}
            className="app-title-right-button"
          >
            {this.appTitleToExplainer()}
          </span>
        </span>
      </div>
    )
  }

  render() {
    const { swipeState } = this.state;
    return (
      <div>
        {this.appBanner('Rock Agenda')}
        <div className="app">
          <SwipeableViews index={swipeState} onChangeIndex={this.updateSwitch}>
            <div>
              <FilterMenu
                appProcessFilterChange={this.appProcessFilterChange}
                locations={this.state.locations}
                timestampNamen={this.state.names}
              />
            </div>
            <main className="app-main">
              <EventBlock
                filterSettings={this.state.filterSettings}
                locations={this.state.locations}
              />
            </main>
            <div>
              <HeaderMenu timestampNamen={this.state.names} />
            </div>
          </SwipeableViews>
        </div>
        {this.appBanner('Swipe links voor filter.')}
      </div>
    );
  }
}

export default App;
