/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */
/* global FS */

import React from "react";
import SituationBar from "./SituationBar";
import GoBoard from "./GoBoard";
import GoPosition, { BLACK, xy2coord } from "./GoPosition";
import Gtp from "./Gtp";

class GoAI extends React.Component {
    constructor(props) {
        super(props)
        this.size = 19;
        this.byoyomi = 3;
        this.state = {
            percent: 50,
            black: "",
            white: "",
            model: new GoPosition(this.size, 0),
            candidates: [],
            ownership: []
        }
        this.gtp = new Gtp();
        document.getElementById("sgf").addEventListener("paste", async (e) => {
            const sgf = (e.clipboardData || window.clipboardData).getData('text');
            const file = "tmp.sgf";
            FS.writeFile(file, sgf);
            await this.gtp.command(`loadsgf ${file}`);
            const model = GoPosition.fromSgf(sgf);
            this.setState({ model: model });
            this.kataAnalyze();
        }, false);
        window.goAI = this; // KataGoが準備できたらkataAnalyzeを始めるため(pre_pre.js)
    }

    render() {
        const size = "500px";
        return (
            <div>
                <SituationBar
                    width={size}
                    blackPercent={this.state.percent}
                    blackInfo={this.state.black}
                    whiteInfo={this.state.white}
                />
                <GoBoard
                    width={size}
                    height={size}
                    w={this.size}
                    h={this.size}
                    candidates={this.state.candidates}
                    model={this.state.model}
                    onClickIntersection={(x, y) => this.play(x, y)}
                />
            </div>
        );
    }

    lzAnalyze() {
        this.gtp.lzAnalyze(100, result => {
            const blackWinrate = (this.state.model.turn === BLACK ? result.winrate : 1 - result.winrate) * 100;
            this.setState({
                candidates: result,
                percent: blackWinrate,
                black: `${blackWinrate.toFixed(1)}%`,
                white: `${(100 - blackWinrate).toFixed(1)}%`
            });
        });
    }

    kataAnalyze() {
        this.gtp.kataAnalyze(100, result => {
            if (result.info.length === 0) {
                return;
            }
            const first = result.info[0];
            const blackWinrate = (this.state.model.turn === BLACK ? first.winrate : 1.0 - first.winrate) * 100;
            const blackScore = (this.state.model.turn === BLACK ? first.scoreMean : 1.0 - first.scoreMean).toFixed(1);
            const scoreStdev = first.scoreStdev.toFixed(1);
            let black;
            let white;
            if (blackWinrate >= 50) {
                black = `${blackWinrate.toFixed(1)}%(${blackScore}±${scoreStdev})`;
                white = `${(100 - blackWinrate).toFixed(1)}%`;
            } else {
                black = `${blackWinrate.toFixed(1)}%`;
                white = `${(100 - blackWinrate).toFixed(1)}%(${-blackScore}±${scoreStdev})`;
            }
            this.setState({
                candidates: result.info,
                ownership: result.ownership,
                percent: blackWinrate,
                black,
                white 
            });
        });
    }

    async play(x, y) {
        try {
            const turn = this.state.model.turn;
            this.setState((state, props) => {
                state.model.play(state.model.xyToPoint(x, y));
                return { model: state.model };
            });
            await this.gtp.command(`play ${turn === BLACK ? "black" : "white"} ${xy2coord(x, y)}`);
            this.kataAnalyze();
        } catch (e) {
            console.log(e);
        }
    }
}

export default GoAI;
