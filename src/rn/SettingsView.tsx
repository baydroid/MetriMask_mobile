import React, { useState } from "react";
import { Text, View } from "react-native";
import DropDownPicker, { ItemType } from 'react-native-dropdown-picker';

import { MC } from "../mc";
import { COLOR_DARKISH_PURPLE, COLOR_MIDDLE_GREY, commonStyles, TitleBar } from "./common";



const INACTIVITY_TIMEOUTS_DD : ItemType<number>[] =
    [
    { label: "5 minutes",  value:  5 },
    { label: "10 minutes", value: 10 },
    { label: "15 minutes", value: 15 },
    { label: "20 minutes", value: 20 },
    { label: "30 minutes", value: 30 },
    { label: "45 minutes", value: 45 },
    { label: "60 minutes", value: 60 },
    ];

export type SettingsViewProps =
    {
    onBurgerPressed : () => any;
    };

export function SettingsView(props : SettingsViewProps) : JSX.Element
    {
    const mc : MC = MC.getMC();
    const [ timeoutDDOpen, setTimeoutDDOpen ] = useState<boolean>(false);
    const [ timeoutDDValue, setTimeoutDDValue ] = useState<number>(actualInactivityTimeoutDDValue());
    const [ timeoutDDItems, setTimeoutDDItems ] = useState<ItemType<number>[]>(INACTIVITY_TIMEOUTS_DD);

    function actualInactivityTimeoutDDValue() : number
        {
        return INACTIVITY_TIMEOUTS_DD[actualInactivityTimeoutDDIndex()].value as number;
        }

    function actualInactivityTimeoutDDIndex() : number
        {
        const currentTimeout : number = mc.getUserInactivityTimeoutMillis()/(1000*60);
        for (let i = 0; i < INACTIVITY_TIMEOUTS_DD.length; i++)
            if (currentTimeout <= INACTIVITY_TIMEOUTS_DD[i].value!) return i;
        return INACTIVITY_TIMEOUTS_DD.length - 1;
        }

    function onSelectTimeout(item : ItemType<number>) : void
        {
        mc.setUserInactivityTimeoutMillis(60*1000*(item.value as number));
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Settings" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ { height: 24 } }/>
            <View style={ commonStyles.squeezed }>
                <Text style={{ color: COLOR_MIDDLE_GREY}}>Lock wallet after inactive for:</Text>
                <DropDownPicker
                    dropDownContainerStyle={{ borderColor: COLOR_DARKISH_PURPLE }}
                    style={{ borderColor: COLOR_DARKISH_PURPLE }}
                    maxHeight={ 300 }
                    flatListProps={{ initialNumToRender: 10 }}
                    items={ timeoutDDItems }
                    open={ timeoutDDOpen }
                    value={ timeoutDDValue as number }
                    setOpen={ setTimeoutDDOpen }
                    setValue={ setTimeoutDDValue }
                    setItems={ setTimeoutDDItems }
                    onSelectItem={ onSelectTimeout }/>
            </View>
        </View>
        );
    }
