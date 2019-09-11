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

import * as React from 'react'
import clsx from 'clsx'
import Websocket from 'react-websocket'

import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import IconButton from '@material-ui/core/IconButton'
import MenuIcon from '@material-ui/icons/Menu'
import Typography from '@material-ui/core/Typography'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Checkbox from '@material-ui/core/Checkbox'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import { withSnackbar, WithSnackbarProps } from 'notistack'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'

import JSONTree from 'react-json-tree'

import { AppStyles } from './Styles'
import { Topology, Node, NodeAttrs, LinkAttrs, LinkTagState } from './Topology'
import { mainListItems, helpListItems } from './Menu'
import AutoCompleteInput from './AutoComplete'
import { a11yProps, TabPanel } from './Tabs'
import { TableDataViewer } from './TableDataViewer'
import './App.css'

import Logo from './Logo.png'

declare var config: any

const data = require('./dump.json')

interface Props extends WithSnackbarProps {
  classes: any
}

interface NodeInfo {
  id: string
  data: any
}

interface State {
  isContextMenuOn: string
  contextMenuX: number
  contextMenuY: number
  isNavOpen: boolean
  linkTagStates: Map<string, LinkTagState>
  overflow: string
  suggestions: Array<string>
  tab: number
  nodeSelected: Array<Node>
}

class App extends React.Component<Props, State> {

  tc: Topology | null
  websocket: Websocket | null
  synced: boolean
  state: State

  constructor(props) {
    super(props)

    this.state = {
      isContextMenuOn: "none",
      contextMenuX: 0,
      contextMenuY: 0,
      isNavOpen: false,
      overflow: 'hidden', // hack for info panel
      linkTagStates: new Map<string, LinkTagState>(),
      suggestions: new Array<string>(),
      tab: 0,
      nodeSelected: new Array<Node>()
    }

    this.synced = false

    this.onShowNodeContextMenu = this.onShowNodeContextMenu.bind(this)
    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onNodeSelected = this.onNodeSelected.bind(this)
    this.onLayerLinkStateChange = this.onLayerLinkStateChange.bind(this)
    this.onSearchChange = this.onSearchChange.bind(this)
    this.onTabChange = this.onTabChange.bind(this)
  }

  componentDidMount() {
    //this.parseTopology(data)
  }

  fillSuggestions(node: Node, suggestions: Set<string>) {
    for (let key of config.suggestions) {
      try {
        var value = eval("node." + key)
        if (Array.isArray(value)) {
          for (let v of value) {
            suggestions.add(v)
          }
        } else if (typeof value === "string") {
          suggestions.add(value)
        }
      } catch (e) { }
    }
  }

  parseTopology(data: { Nodes: any, Edges: any }) {
    if (!this.tc) {
      return
    }

    var suggestions = new Set<string>()

    // first add all the nodes
    for (let node of data.Nodes) {

      // ignore Type ofrule
      if (node.Metadata.Type === "ofrule") {
        continue
      }

      let n = this.tc.addNode(node.ID, ["infra"], node.Metadata)
      this.tc.setParent(n, this.tc.root, config.nodeAttrs(n).weight)

      this.fillSuggestions(n, suggestions)
    }

    if (!data.Edges) {
      return
    }

    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType === "ownership") {
        let parent = this.tc.nodes.get(edge.Parent)
        let child = this.tc.nodes.get(edge.Child)

        if (parent && child) {
          this.tc.setParent(child, parent, config.nodeAttrs(child).weight)
        }
      }
    }

    // finally add remaining links
    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType !== "ownership") {
        let parent = this.tc.nodes.get(edge.Parent)
        let child = this.tc.nodes.get(edge.Child)

        if (parent && child) {
          this.tc.addLink(parent, child, [edge.Metadata.RelationType], edge.Metadata, edge.Metadata.Directed)
        }
      }
    }

    // show infra layer
    this.tc.showNodeTag("infra", true)

    // get list of link layer types
    this.setState({ linkTagStates: this.tc.linkTagStates })

    this.setState({ suggestions: Array.from(suggestions) })

    this.tc.zoomFit()
  }

  nodeAttrs(node: Node): NodeAttrs {
    var attrs = config.nodeAttrs(node)
    if (node.data.State) {
      attrs.classes.push(node.data.State.toLowerCase())
    }

    return attrs
  }

  linkAttrs(link): LinkAttrs {
    return { class: link.RelationType || "" }
  }

  onNodeSelected(node: Node, active: boolean) {
    var nodes = this.state.nodeSelected.filter(d => node.id !== d.id)
    if (active) {
      nodes.push(node)
    }
    var tab = this.state.tab
    if (tab >= nodes.length) {
      tab = nodes.length - 1
    }
    if (tab < 0) {
      tab = 0
    }

    this.setState({ nodeSelected: nodes, tab: tab })

    // hack in order to restore overflow of panel after transition
    setTimeout(() => {
      this.setState({ overflow: 'auto' })
    }, 1000)
  }

  renderTabs() {
    return this.state.nodeSelected.map((d: Node, i: number) => (
      <Tab key={"tab-" + i} label={d.id.split("-", 2)[0] + "-..."} {...a11yProps(i)} />
    ))
  }

  renderTabPanels(classes: any) {
    return this.state.nodeSelected.map((node: Node, i: number) => (
      <TabPanel key={"tabpanel-" + i} value={this.state.tab} index={i}>
        <Typography component="h6" color="primary" gutterBottom>
          {node.id}
        </Typography>
        <JSONTree className={classes.jsonTree} data={node.data} theme="bright" invertTheme hideRoot sortObjectKeys />
      </TabPanel>
    ))
  }

  weightTitles(): Map<number, string> {
    var map = new Map<number, string>()
    Object.keys(config.weightTitles).forEach(key => {
      var index = parseInt(key)
      map.set(index, config.weightTitles[index]);
    })
    return map
  }

  sortNodesFnc(a, b) {
    return a.data.Name.localeCompare(b.data.Name)
  }

  onShowNodeContextMenu(node) {
    return [
      { class: "", text: "Capture", disabled: false, callback: () => { console.log("Capture") } },
      { class: "", text: "Capture all", disabled: true, callback: () => { console.log("Capture all") } },
      { class: "", text: "Injection", disabled: false, callback: () => { console.log("Injection") } },
      { class: "", text: "Flows", disabled: false, callback: () => { console.log("Flows") } }
    ]
  }

  onMessage(msg: string) {
    var data: { Type: string, Obj: any } = JSON.parse(msg)
    switch (data.Type) {
      case "SyncReply":
        if (!data.Obj.Nodes) {
          return
        }
        this.parseTopology(data.Obj)
        this.synced = true
        break
      default:
        break
    }
  }

  onClose() {
    if (this.synced) {
      this.notify("Disconnected", "error")
    } else {
      this.notify("Not connected", "error")
    }

    this.synced = false
  }

  sendMessage(data) {
    this.websocket.sendMessage(JSON.stringify(data))
  }

  sync() {
    var msg = { "Namespace": "Graph", "Type": "SyncRequest", "Obj": null }
    this.sendMessage(msg)
  }

  onOpen() {
    if (!this.tc) {
      return
    }

    this.notify("Connected", "info")
    this.tc.resetTree()
    this.sync()
    this.notify("Synchronized", "info")
  }

  notify(msg, variant) {
    this.props.enqueueSnackbar(msg, {
      variant: variant,
      autoHideDuration: 1000,
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'right',
      }
    })
  }

  openDrawer() {
    this.setState({ isNavOpen: true })
  }

  closeDrawer() {
    this.setState({ isNavOpen: false })
  }

  onLayerLinkStateChange(event) {
    if (!this.tc) {
      return
    }

    switch (this.tc.linkTagStates.get(event.target.value)) {
      case LinkTagState.Hidden:
        this.tc.setLinkTagState(event.target.value, LinkTagState.EventBased)
        break
      case LinkTagState.EventBased:
        this.tc.setLinkTagState(event.target.value, LinkTagState.Visible)
        break
      case LinkTagState.Visible:
        this.tc.setLinkTagState(event.target.value, LinkTagState.Hidden)
        break
    }

    this.setState({ linkTagStates: this.tc.linkTagStates })
  }

  onSearchChange(selected: Array<string>) {
    if (!this.tc) {
      return
    }

    this.tc.clearHighlightNodes()
    this.tc.searchNodes(selected).forEach(node => {
      if (this.tc) {
        this.tc.highlightNode(node, true)
      }
    })
  }

  onTabChange(event: React.ChangeEvent<{}>, value: number) {
    this.setState({ tab: value })
  }

  render() {
    const { classes } = this.props

    return (
      <div className={classes.app}>
        <CssBaseline />
        <Websocket ref={node => this.websocket = node} url="ws://localhost:8082/ws/subscriber?x-client-type=webui" onOpen={this.onOpen}
          onMessage={this.onMessage} onClose={this.onClose} reconnectIntervalInMilliSeconds={2500} />
        <AppBar position="absolute" className={clsx(classes.appBar, this.state.isNavOpen && classes.appBarShift)}>
          <Toolbar className={classes.toolbar}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => this.openDrawer()}
              className={clsx(classes.menuButton, this.state.isNavOpen && classes.menuButtonHidden)}>
              <MenuIcon />
            </IconButton>
            <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
              <img src={Logo} alt="logo" />
            </Typography>
            <div className={classes.search}>
              <AutoCompleteInput placeholder="metadata value" suggestions={this.state.suggestions} onChange={this.onSearchChange} />
            </div>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: clsx(classes.drawerPaper, !this.state.isNavOpen && classes.drawerPaperClose),
          }}
          open={this.state.isNavOpen}>
          <div className={classes.toolbarIcon}>
            <IconButton onClick={() => this.closeDrawer()}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <Divider />
          <List>{mainListItems}</List>
          <Divider />
          <List>{helpListItems}</List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.appBarSpacer} />
          <Container maxWidth="xl" className={classes.container}>
            <Topology className={classes.topology} ref={node => this.tc = node} nodeAttrs={this.nodeAttrs} linkAttrs={this.linkAttrs}
              onNodeSelected={this.onNodeSelected} sortNodesFnc={this.sortNodesFnc}
              onShowNodeContextMenu={this.onShowNodeContextMenu} weightTitles={this.weightTitles()} />
          </Container>
          <Container className={classes.rightPanel}>
            <Paper className={clsx(classes.rightPanelPaper, !this.state.nodeSelected.length && classes.rightPanelPaperClose)}>
              <div className={classes.tabs}>
                <Tabs
                  orientation="vertical"
                  variant="scrollable"
                  value={this.state.tab}
                  onChange={this.onTabChange}
                  aria-label="Vertical tabs example"
                  className={classes.tab}>
                  {this.renderTabs()}
                </Tabs>
                <div className={classes.rightPanelPaperContent} style={{ overflow: this.state.overflow }} >
                  {this.renderTabPanels(classes)}
                </div>
              </div>
            </Paper>
          </Container>
          <Container className={classes.nodeTagsPanel}>
            <Paper className={classes.nodeTagsPanelPaper}>
              <div className={classes.nodeTagsPanelPaperFragment}>
                <Typography component="h6" color="primary" gutterBottom>
                  Link types
                </Typography>
                <FormGroup>
                  {Array.from(this.state.linkTagStates.keys()).map((key) => (
                    <FormControlLabel key={key} control={
                      <Checkbox value={key} color="primary" onChange={this.onLayerLinkStateChange}
                        checked={this.state.linkTagStates.get(key) === LinkTagState.Visible}
                        indeterminate={this.state.linkTagStates.get(key) === LinkTagState.EventBased} />
                    }
                      label={key} />
                  ))}
                </FormGroup>
              </div>
            </Paper>
          </Container>
        </main>
      </div>
    )
  }
}

export default withStyles(AppStyles)(withSnackbar(App))
