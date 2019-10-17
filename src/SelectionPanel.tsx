/*
 * Copyright (C) 2019 Sylvain Afchain
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as React from "react"
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import { AppState } from './Store'
import { connect } from 'react-redux'
import { Node, Link } from './Topology'
import { DataViewer } from './DataViewer'
import { a11yProps, TabPanel } from './Tabs'

declare var config: any

interface Props {
  classes: any
  selection: Array<Node | Link>
  revision: number
}

interface State {
  tab: number
}

class SelectionPanel extends React.PureComponent<Props, State> {

  state: State

  constructor(props) {
    super(props)

    this.state = {
      tab: 0
    }
  }

  renderTabs(classes: any) {
    return this.props.selection.map((d: Node, i: number) => {
      var className = classes.tabIconFree
      if (config.nodeAttrs(d).classes.includes("font-brands")) {
        className = classes.tabIconBrands
      }
      return (
        <Tab className="tab" icon={<span className={className}>{config.nodeAttrs(d).icon}</span>}
          key={"tab-" + i} label={<span className={classes.tabTitle}>{config.nodeTabTitle(d)}</span>} {...a11yProps(i)} />
      )
    })
  }

  renderTabPanels(classes: any) {
    return this.props.selection.map((node: Node, i: number) => {
      if (this.state.tab !== i) {
        return null
      }

      return (
        <TabPanel key={"tabpanel-" + node.id} value={this.state.tab} index={i}>
          <DataViewer key={"dataviewer-general-" + node.id} classes={classes} title="General" data={node.data} defaultExpanded={true} />

          {config.nodeDataFields.map(cfg => {
            if (node.data[cfg.field]) {
              return (
                <DataViewer key={"dataviewer-" + cfg.field + "-" + node.id} classes={classes} title={cfg.title || cfg.field}
                  defaultExpanded={cfg.expanded} data={node.data[cfg.field]}
                  normalizer={cfg.normalizer} />
              )
            }
          })
          }
        </TabPanel>
      )
    })
  }

  onTabChange(event: React.ChangeEvent<{}>, value: number) {
    this.setState({ tab: value })
  }

  render() {
    const { classes } = this.props

    var tab = this.state.tab
    if (tab >= this.props.selection.length) {
      tab = this.props.selection.length - 1
    }
    if (tab < 0) {
      tab = 0
    }

    return (
      <div className={classes.tabs}>
        <Tabs
          orientation="horizontal"
          variant="scrollable"
          value={tab}
          onChange={this.onTabChange.bind(this)}
          aria-label="Metadata"
          indicatorColor="primary">
          {this.renderTabs(classes)}
        </Tabs>
        <div className={classes.rightPanelPaperContent} style={{ overflow: "auto" }}>
          {this.renderTabPanels(classes)}
        </div>
      </div>
    )
  }
}

export const mapStateToProps = (state: AppState) => ({
  selection: state.selection,
  revision: state.selectionRevision
})

export const mapDispatchToProps = ({
})

export default connect(mapStateToProps, mapDispatchToProps)(SelectionPanel)